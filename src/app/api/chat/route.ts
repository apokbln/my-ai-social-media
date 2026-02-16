import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  if (!chatId) {
    return NextResponse.json({ reply: "chatId eksik!" }, { status: 400 });
  }

  const systemPrompt = {
    role: "system",
    content: `Sen bir sosyal medya danışmanısın. Kullanıcıya Instagram, Twitter, LinkedIn gibi platformlarda içerik üretimi, paylaşım zamanı, etkileşim artırma ve hashtag kullanımı konularında profesyonel öneriler sunacaksın. 

    Ekstra:
    - Eğer kullanıcı platform belirtirse, cevabını o platformun dinamiklerine göre özelleştir.
    - Yanıtlarında emoji kullan ve kısa, net, uygulanabilir öneriler ver.
    - Gerekirse örnek bir paylaşım metni oluştur.
    - Kullanıcıya sorular sorarak daha iyi yardımcı olabileceğini belirt.


    `,
  };

  // OpenAI'ya gönderilecek mesajlarda 'ai' -> 'assistant' düzeltmesi
  const fixedMessages = messages.map((msg: any) =>
    msg.role === 'ai' ? { ...msg, role: 'assistant' } : msg
  );
  const fullMessages = [systemPrompt, ...fixedMessages];

  const body = {
    model: "gpt-4",
    messages: fullMessages,
    temperature: 0.8,
  };

  try {
    await connectDB();

    // Tüm mesajları veritabanında yoksa kaydet
    for (const msg of messages) {
      const exists = await Message.findOne({ chatId, role: msg.role, content: msg.content });
      if (!exists) {
        await Message.create({ chatId, role: msg.role, content: msg.content });
      }
    }

    const lastUserMessage = messages[messages.length - 1];

    console.log("OpenAI'ya gönderilen body:", JSON.stringify(body, null, 2));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("OpenAI'dan dönen yanıt:", JSON.stringify(data, null, 2));

    const aiReply = data.choices?.[0]?.message?.content || "Yanıt alınamadı.";

    await Message.create({
      chatId,
      role: "assistant",
      content: aiReply,
    });

    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error("Chat API Hatası:", error);
    return NextResponse.json(
      { reply: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
