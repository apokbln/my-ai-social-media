import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { HashtagCache } from "@/models/HashtagCache";

type Platform = "x" | "instagram" | "linkedin" | "tiktok";

// Cache süresi: 6 saat
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

/**
 * Hex renk kodu kontrolü (hashtag olarak algılanmaması için)
 */
function isHexColorCode(tag: string): boolean {
  // Hex renk kodları genellikle 3, 4, 6 veya 8 karakterlik ve sadece 0-9, a-f içerir
  // Örnekler: #000, #0000, #03a9f4, #03a9f4ff
  // Eğer hashtag sadece 0-9 ve a-f içeriyorsa (g-z harfleri yoksa) ve uzunluğu 3-6 karakter arasındaysa, muhtemelen renk kodudur
  // Gerçek hashtag'ler genellikle g-z arası harfler de içerir veya harflerle başlar
  const hexOnlyPattern = /^[0-9a-f]+$/i;
  if (hexOnlyPattern.test(tag) && tag.length >= 3 && tag.length <= 6) {
    // Eğer sadece hex karakterlerden oluşuyorsa ve uzunluğu 3-6 karakter arasındaysa renk kodu olabilir
    // Ancak "abc" gibi 3 karakterlik bir hashtag de olabilir, bu yüzden kontrol edelim
    // Eğer içinde g-z arası harf varsa, bu bir hashtag olabilir
    const hasNonHexLetters = /[g-z]/i.test(tag);
    return !hasNonHexLetters; // Eğer g-z harfleri yoksa, renk kodu olabilir
  }
  return false;
}

/**
 * Platform bazlı hashtag üretimi için AI prompt'ları
 */
const getPlatformPrompt = (platform: Platform): string => {
  const prompts: Record<Platform, string> = {
    x: `Sen bir Twitter (X) trend analiz uzmanısın. Şu anda Twitter'da en popüler olan 10 hashtag'i tahmin et. 
    Güncel olaylar, teknoloji, eğlence, spor, siyaset gibi kategorilerdeki trend hashtag'leri düşün.
    Sadece hashtag'leri liste halinde ver, açıklama yapma. Format: #hashtag1 #hashtag2 #hashtag3 ... #hashtag10`,
    
    instagram: `Sen bir Instagram trend analiz uzmanısın. Şu anda Instagram'da en popüler olan 10 hashtag'i tahmin et.
    Moda, güzellik, seyahat, yemek, fitness, yaşam tarzı gibi kategorilerdeki trend hashtag'leri düşün.
    Sadece hashtag'leri liste halinde ver, açıklama yapma. Format: #hashtag1 #hashtag2 #hashtag3 ... #hashtag10`,
    
    linkedin: `Sen bir LinkedIn trend analiz uzmanısın. Şu anda LinkedIn'de en popüler olan 10 hashtag'i tahmin et.
    İş, kariyer, teknoloji, liderlik, girişimcilik, profesyonel gelişim gibi kategorilerdeki trend hashtag'leri düşün.
    Sadece hashtag'leri liste halinde ver, açıklama yapma. Format: #hashtag1 #hashtag2 #hashtag3 ... #hashtag10`,
    
    tiktok: `Sen bir TikTok trend analiz uzmanısın. Şu anda TikTok'ta en popüler olan 10 hashtag'i tahmin et.
    Eğlence, dans, komedi, yaşam hileleri, viral challenge'lar gibi kategorilerdeki trend hashtag'leri düşün.
    Sadece hashtag'leri liste halinde ver, açıklama yapma. Format: #hashtag1 #hashtag2 #hashtag3 ... #hashtag10`,
  };
  
  return prompts[platform];
};

/**
 * Trends24'ten X (Twitter) hashtag'lerini çek
 * Trends24'in HTML yapısını parse ederek trend hashtag'lerini çıkarır
 */
async function fetchHashtagsFromTrends24(): Promise<{ hashtags: string[]; isEstimated: boolean }> {
  try {
    // Trends24'in Türkiye trend sayfası (veya global)
    const url = "https://trends24.in/turkey/";
    
    // Timeout için AbortController kullan
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://trends24.in/",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Trends24 fetch error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Yöntem 1: Trends24'in trend-item class'larından hashtag'leri çek
    // Trends24 genellikle <div class="trend-item"> veya <li> içinde hashtag'leri gösterir
    const trendItemRegex = /<div[^>]*class="[^"]*trend-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a>/gi;
    const trendMatches = [...html.matchAll(trendItemRegex)];
    
    if (trendMatches.length > 0) {
      const hashtags = trendMatches
        .map(match => {
          const text = match[1]?.trim() || "";
          // Hashtag'i temizle (# işaretini kaldır, boşlukları temizle)
          return text.replace(/^#+/, "").trim();
        })
        .filter(tag => tag.length > 1 && tag.length < 50)
        .filter(tag => !tag.match(/^\d+$/)) // Sadece sayı olanları filtrele
        .filter(tag => !tag.toLowerCase().includes("trend")) // "trend" kelimesini içerenleri filtrele
        .filter(tag => !isHexColorCode(tag)) // Hex renk kodlarını filtrele
        .filter(tag => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(tag)) // En az bir harf içermeli
        .slice(0, 10);
      
      if (hashtags.length >= 3) {
        return {
          hashtags: hashtags.slice(0, 10),
          isEstimated: false, // Trends24'ten gerçek veri
        };
      }
    }
    
    // Yöntem 2: Tüm hashtag pattern'lerini bul (#hashtag formatı)
    const hashtagRegex = /#([a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+)/g;
    const allMatches = [...html.matchAll(hashtagRegex)];
    
    if (allMatches.length > 0) {
      // Hashtag'leri unique yap ve sırala
      const uniqueHashtags = Array.from(new Set(
        allMatches
          .map(match => match[1]?.trim().toLowerCase())
          .filter(tag => tag && tag.length > 1 && tag.length < 30)
          .filter(tag => !tag.match(/^(trend|trending|hashtag|twitter|x)$/i)) // Genel kelimeleri filtrele
          .filter(tag => !isHexColorCode(tag)) // Hex renk kodlarını filtrele
          .filter(tag => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(tag)) // En az bir harf içermeli (sadece sayı değil)
      ));
      
      if (uniqueHashtags.length >= 3) {
        return {
          hashtags: uniqueHashtags.slice(0, 10),
          isEstimated: false,
        };
      }
    }
    
    // Yöntem 3: Trends24'in JSON verisi varsa (bazı sayfalarda olabilir)
    const jsonDataRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    const jsonMatches = [...html.matchAll(jsonDataRegex)];
    
    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        // JSON yapısına göre hashtag'leri çıkar (site yapısına bağlı)
        if (jsonData.trends || jsonData.hashtags) {
          const trends = jsonData.trends || jsonData.hashtags || [];
          const hashtags = trends
            .map((item: any) => item.name || item.hashtag || item.text)
            .filter((tag: string) => tag && typeof tag === "string")
            .map((tag: string) => tag.replace(/^#+/, "").trim())
            .filter((tag: string) => tag.length > 1 && tag.length < 30)
            .filter((tag: string) => !isHexColorCode(tag)) // Hex renk kodlarını filtrele
            .filter((tag: string) => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(tag)) // En az bir harf içermeli
            .slice(0, 10);
          
          if (hashtags.length >= 3) {
            return {
              hashtags: hashtags.slice(0, 10),
              isEstimated: false,
            };
          }
        }
      } catch (e) {
        // JSON parse hatası, devam et
        continue;
      }
    }
    
    throw new Error("Trends24'ten hashtag bulunamadı - HTML yapısı değişmiş olabilir");
  } catch (error: any) {
    console.error("Trends24 fetch error:", error);
    // Hata durumunda AI'ya fallback yap
    throw error;
  }
}

/**
 * Instagram için üçüncü taraf sitelerden trend hashtag'leri çek
 * Best-Hashtags, DisplayPurposes gibi sitelerden veri çeker
 */
async function fetchInstagramHashtags(): Promise<{ hashtags: string[]; isEstimated: boolean }> {
  const sources = [
    {
      name: "Best-Hashtags",
      url: "https://best-hashtags.com/hashtag/instagram/",
      parser: (html: string) => {
        // Best-Hashtags genellikle hashtag'leri liste halinde gösterir
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "DisplayPurposes",
      url: "https://displaypurposes.com/ranking/trending",
      parser: (html: string) => {
        // DisplayPurposes trending hashtag'leri gösterir
        const hashtagRegex = /"hashtag":"([^"]+)"/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "Inflact",
      url: "https://inflact.com/tools/instagram-hashtags-generator/",
      parser: (html: string) => {
        // Inflact hashtag generator sayfasından hashtag'leri çıkar
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
  ];

  // Her kaynaktan sırayla dene
  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 saniye timeout

      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.google.com/",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue; // Bir sonraki kaynağa geç
      }

      const html = await response.text();
      const hashtags = source.parser(html);

      if (hashtags.length >= 3) {
        // Hashtag'leri filtrele ve temizle
        const cleanedHashtags = Array.from(new Set(
          hashtags
            .filter(tag => tag && tag.length > 1 && tag.length < 30)
            .filter(tag => !tag.match(/^(instagram|insta|hashtag|trend|trending|popular|best)$/i))
            .filter(tag => /^[a-z0-9_]+$/.test(tag)) // Sadece alfanumerik ve underscore
        )).slice(0, 10); // İlk 10'u al

        if (cleanedHashtags.length >= 3) {
          // En popüler 10'u seç
          return {
            hashtags: cleanedHashtags.slice(0, 10),
            isEstimated: false, // Üçüncü taraf siteden gerçek veri
          };
        }
      }
    } catch (error) {
      console.error(`${source.name} fetch error:`, error);
      continue; // Bir sonraki kaynağa geç
    }
  }

  // Tüm kaynaklar başarısız olursa, alternatif yöntem: Genel popüler hashtag'ler
  // Bu hashtag'ler 2025 yılında en popüler Instagram hashtag'leri
  const popularHashtags = [
    "love", "instagood", "photooftheday", "fashion", "beautiful",
    "art", "photography", "nature", "reels", "travel", "style",
    "food", "fitness", "motivation", "lifestyle", "ootd", "viral",
    "explore", "trend", "aesthetic", "vibe", "mood", "inspiration"
  ];

  // Rastgele 10 tane seç (her seferinde farklı olması için)
  const shuffled = popularHashtags.sort(() => 0.5 - Math.random());
  return {
    hashtags: shuffled.slice(0, 10),
    isEstimated: true, // Popüler hashtag'ler ama trend değil
  };
}

/**
 * TikTok için üçüncü taraf sitelerden trend hashtag'leri çek
 */
async function fetchTikTokHashtags(): Promise<{ hashtags: string[]; isEstimated: boolean }> {
  const sources = [
    {
      name: "Best-Hashtags",
      url: "https://best-hashtags.com/hashtag/tiktok/",
      parser: (html: string) => {
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "Ranktracker",
      url: "https://www.ranktracker.com/tr/tiktok-hashtag-generator/",
      parser: (html: string) => {
        // Ranktracker hashtag generator'dan hashtag'leri çıkar
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "TikTokHashtags",
      url: "https://www.tiktokhashtags.com/",
      parser: (html: string) => {
        // TikTokHashtags trending hashtag'leri gösterir
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
  ];

  // Her kaynaktan sırayla dene
  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.google.com/",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const hashtags = source.parser(html);

      if (hashtags.length >= 3) {
        const cleanedHashtags = Array.from(new Set(
          hashtags
            .filter(tag => tag && tag.length > 1 && tag.length < 30)
            .filter(tag => !tag.match(/^(tiktok|tik|hashtag|trend|trending|popular|best|fyp|foryou)$/i))
            .filter(tag => /^[a-z0-9_]+$/.test(tag))
        )).slice(0, 10);

        if (cleanedHashtags.length >= 3) {
          return {
            hashtags: cleanedHashtags.slice(0, 10),
            isEstimated: false,
          };
        }
      }
    } catch (error) {
      console.error(`${source.name} fetch error:`, error);
      continue;
    }
  }

  // Fallback: 2025 popüler TikTok hashtag'leri
  const popularHashtags = [
    "fyp", "foryou", "viral", "trending", "comedy", "dance",
    "music", "funny", "love", "fashion", "beauty", "food",
    "travel", "fitness", "motivation", "life", "art", "pov",
    "explore", "trend", "challenge", "aesthetic", "vibe", "mood"
  ];

  const shuffled = popularHashtags.sort(() => 0.5 - Math.random());
  return {
    hashtags: shuffled.slice(0, 10),
    isEstimated: true,
  };
}

/**
 * LinkedIn için üçüncü taraf sitelerden trend hashtag'leri çek
 */
async function fetchLinkedInHashtags(): Promise<{ hashtags: string[]; isEstimated: boolean }> {
  const sources = [
    {
      name: "Best-Hashtags",
      url: "https://best-hashtags.com/hashtag/linkedin/",
      parser: (html: string) => {
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "LinkedInHashtags",
      url: "https://www.linkedin.com/feed/hashtag/",
      parser: (html: string) => {
        // LinkedIn feed'den hashtag'leri çıkar
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
    {
      name: "SocialMediaExaminer",
      url: "https://www.socialmediaexaminer.com/linkedin-hashtags/",
      parser: (html: string) => {
        // Social Media Examiner'dan LinkedIn hashtag önerileri
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const matches = [...html.matchAll(hashtagRegex)];
        return matches.map(m => m[1]?.toLowerCase()).filter(Boolean);
      },
    },
  ];

  // Her kaynaktan sırayla dene
  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.google.com/",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const hashtags = source.parser(html);

      if (hashtags.length >= 3) {
        const cleanedHashtags = Array.from(new Set(
          hashtags
            .filter(tag => tag && tag.length > 1 && tag.length < 30)
            .filter(tag => !tag.match(/^(linkedin|linked|hashtag|trend|trending|popular|best|business|professional)$/i))
            .filter(tag => /^[a-z0-9_]+$/.test(tag))
        )).slice(0, 10);

        if (cleanedHashtags.length >= 3) {
          return {
            hashtags: cleanedHashtags.slice(0, 10),
            isEstimated: false,
          };
        }
      }
    } catch (error) {
      console.error(`${source.name} fetch error:`, error);
      continue;
    }
  }

  // Fallback: 2025 popüler LinkedIn hashtag'leri
  const popularHashtags = [
    "leadership", "innovation", "career", "business", "entrepreneurship",
    "technology", "marketing", "networking", "professional", "success",
    "motivation", "productivity", "startup", "management", "sales",
    "hr", "finance", "strategy", "growth", "digital"
  ];

  const shuffled = popularHashtags.sort(() => 0.5 - Math.random());
  return {
    hashtags: shuffled.slice(0, 10),
    isEstimated: true,
  };
}

/**
 * AI ile hashtag üret
 */
async function generateHashtagsWithAI(platform: Platform): Promise<{ hashtags: string[]; isEstimated: boolean }> {
  try {
    const systemPrompt = getPlatformPrompt(platform);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Daha ekonomik model
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Şu anda ${platform} platformunda en popüler 10 hashtag'i ver. Sadece hashtag'leri # işaretiyle birlikte liste halinde ver.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200, // 10 hashtag için daha fazla token
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Hashtag'leri parse et (#hashtag formatından)
    const hashtags = content
      .split(/\s+/)
      .filter((tag: string) => tag.startsWith("#"))
      .map((tag: string) => tag.replace("#", "").trim())
      .filter((tag: string) => tag.length > 0)
      .slice(0, 10); // En fazla 10 hashtag

    // Eğer yeterli hashtag yoksa, fallback hashtag'ler kullan
    if (hashtags.length < 10) {
      const fallbackHashtags = getFallbackHashtags(platform);
      hashtags.push(...fallbackHashtags.slice(0, 10 - hashtags.length));
    }

    return {
      hashtags: hashtags.slice(0, 10),
      isEstimated: true,
    };
  } catch (error) {
    console.error(`AI hashtag generation error for ${platform}:`, error);
    // Hata durumunda fallback hashtag'ler döndür
    return {
      hashtags: getFallbackHashtags(platform).slice(0, 10),
      isEstimated: true,
    };
  }
}

/**
 * Fallback hashtag'ler (AI çalışmazsa)
 */
function getFallbackHashtags(platform: Platform): string[] {
  const fallbacks: Record<Platform, string[]> = {
    x: ["trending", "news", "viral", "breaking", "update", "world", "politics", "tech", "sports", "entertainment"],
    instagram: ["instagood", "photooftheday", "lifestyle", "love", "fashion", "beautiful", "art", "photography", "nature", "travel"],
    linkedin: ["leadership", "innovation", "career", "business", "entrepreneurship", "technology", "marketing", "networking", "professional", "success"],
    tiktok: ["fyp", "viral", "trending", "foryou", "comedy", "dance", "music", "funny", "love", "fashion"],
  };
  return fallbacks[platform] || ["trending", "viral", "popular", "news", "update", "breaking", "world", "tech", "sports", "entertainment"];
}

/**
 * GET /api/hashtags?platform=x
 * Platform için hashtag'leri getir (cache'den veya AI ile üret)
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
  try {
    await connectDB();
    
    const platform = searchParams.get("platform") as Platform;

    if (!platform || !["x", "instagram", "linkedin", "tiktok"].includes(platform)) {
      return NextResponse.json(
        { error: "Geçerli bir platform belirtin: x, instagram, linkedin, tiktok" },
        { status: 400 }
      );
    }

    // Cache'den kontrol et
    const cached = await HashtagCache.findOne({ 
      platform,
      expiresAt: { $gt: new Date() }
    });

    if (cached) {
      return NextResponse.json({
        hashtags: cached.hashtags,
        isEstimated: cached.isEstimated,
        cached: true,
        lastUpdated: cached.lastUpdated,
      });
    }

    // Cache yoksa veya expire olmuşsa, platforma göre veri kaynağı seç
    let hashtags: string[] = [];
    let isEstimated: boolean = true;

    if (platform === "x") {
      // X (Twitter) için önce Trends24'ü dene
      try {
        const trends24Data = await fetchHashtagsFromTrends24();
        hashtags = trends24Data.hashtags;
        isEstimated = trends24Data.isEstimated;
      } catch (error) {
        console.error("Trends24 fetch failed, falling back to AI:", error);
        // Trends24 başarısız olursa AI'ya fallback
        const aiData = await generateHashtagsWithAI(platform);
        hashtags = aiData.hashtags;
        isEstimated = true; // AI tahmini olduğunu belirt
      }
    } else if (platform === "instagram") {
      // Instagram için üçüncü taraf sitelerden çek
      try {
        const instagramData = await fetchInstagramHashtags();
        hashtags = instagramData.hashtags;
        isEstimated = instagramData.isEstimated;
        
        // Eğer hala estimated ise (popüler hashtag'ler kullanıldıysa), AI'ya fallback yap
        if (isEstimated) {
          const aiData = await generateHashtagsWithAI(platform);
          hashtags = aiData.hashtags;
          isEstimated = true;
        }
      } catch (error) {
        console.error("Instagram hashtag fetch failed, falling back to AI:", error);
        const aiData = await generateHashtagsWithAI(platform);
        hashtags = aiData.hashtags;
        isEstimated = true;
      }
    } else if (platform === "tiktok") {
      // TikTok için üçüncü taraf sitelerden çek
      try {
        const tiktokData = await fetchTikTokHashtags();
        hashtags = tiktokData.hashtags;
        isEstimated = tiktokData.isEstimated;
        
        // Eğer hala estimated ise (popüler hashtag'ler kullanıldıysa), AI'ya fallback yap
        if (isEstimated) {
          const aiData = await generateHashtagsWithAI(platform);
          hashtags = aiData.hashtags;
          isEstimated = true;
        }
      } catch (error) {
        console.error("TikTok hashtag fetch failed, falling back to AI:", error);
        const aiData = await generateHashtagsWithAI(platform);
        hashtags = aiData.hashtags;
        isEstimated = true;
      }
    } else if (platform === "linkedin") {
      // LinkedIn için üçüncü taraf sitelerden çek
      try {
        const linkedinData = await fetchLinkedInHashtags();
        hashtags = linkedinData.hashtags;
        isEstimated = linkedinData.isEstimated;
        
        // Eğer hala estimated ise (popüler hashtag'ler kullanıldıysa), AI'ya fallback yap
        if (isEstimated) {
          const aiData = await generateHashtagsWithAI(platform);
          hashtags = aiData.hashtags;
          isEstimated = true;
        }
      } catch (error) {
        console.error("LinkedIn hashtag fetch failed, falling back to AI:", error);
        const aiData = await generateHashtagsWithAI(platform);
        hashtags = aiData.hashtags;
        isEstimated = true;
      }
    } else {
      // Diğer platformlar için AI kullan
      const aiData = await generateHashtagsWithAI(platform);
      hashtags = aiData.hashtags;
      isEstimated = aiData.isEstimated;
    }

    // Platform bazlı cache süresi
    const cacheDuration = platform === "x" 
      ? 1 * 60 * 60 * 1000  // 1 saat (Trends24'ten gerçek veri)
      : platform === "instagram"
      ? 2 * 60 * 60 * 1000  // 2 saat (Üçüncü taraf sitelerden veri)
      : platform === "tiktok"
      ? 2 * 60 * 60 * 1000  // 2 saat (Üçüncü taraf sitelerden veri)
      : platform === "linkedin"
      ? 2 * 60 * 60 * 1000  // 2 saat (Üçüncü taraf sitelerden veri)
      : CACHE_DURATION_MS;   // 6 saat (AI tahmini - fallback)
    
    const expiresAt = new Date(Date.now() + cacheDuration);
    
    await HashtagCache.findOneAndUpdate(
      { platform },
      {
        platform,
        hashtags,
        isEstimated,
        lastUpdated: new Date(),
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      hashtags,
      isEstimated,
      cached: false,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Hashtag API error:", error);
    return NextResponse.json(
      { 
        error: "Hashtag'ler alınırken bir hata oluştu.",
        hashtags: getFallbackHashtags((searchParams.get("platform") as Platform) || "x").slice(0, 10),
        isEstimated: true,
      },
      { status: 500 }
    );
  }
}

