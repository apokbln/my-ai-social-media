"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import React from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Platform = "x" | "instagram" | "linkedin" | "tiktok";

interface HashtagResponse {
  hashtags: string[];
  isEstimated: boolean;
  cached?: boolean;
  lastUpdated?: string;
}

const platformNames: Record<Platform, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

// Platform iconları - SVG veya Unicode karakterler
const PlatformIcon = ({ platform }: { platform: Platform }) => {
  const icons: Record<Platform, React.ReactElement> = {
    x: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    linkedin: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    tiktok: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  };
  
  return icons[platform];
};

export default function TrendHashtagsSidebar() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("x");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, error, isLoading, mutate } = useSWR<HashtagResponse>(
    `/api/hashtags?platform=${selectedPlatform}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: autoRefresh 
        ? (selectedPlatform === "x" 
            ? 1 * 60 * 60 * 1000  // X için 1 saat
            : selectedPlatform === "instagram" || selectedPlatform === "tiktok" || selectedPlatform === "linkedin"
            ? 2 * 60 * 60 * 1000  // Instagram, TikTok, LinkedIn için 2 saat
            : 6 * 60 * 60 * 1000) // diğerleri için 6 saat (iptal)
        : 0,
    }
  );

  // Platform değiştiğinde cache'i temizle ve yeniden yükle
  useEffect(() => {
    mutate();
  }, [selectedPlatform, mutate]);

  const handleRefresh = () => {
    mutate();
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dakika önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
  };

  return (
    <aside className="w-80 bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 h-full overflow-y-auto border-l border-gray-700 shadow-xl flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-wide flex items-center gap-2">
            <span>🔥</span> Trend Hashtag'ler
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            title="Yenile"
          >
            <span className="text-lg">🔄</span>
          </button>
        </div>

        {/* Platform Seçici */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Platform Seç
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["x", "instagram", "linkedin", "tiktok"] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                  ${
                    selectedPlatform === platform
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }
                `}
              >
                <span className="mr-1 flex items-center">
                  <PlatformIcon platform={platform} />
                </span>
                {platformNames[platform].split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hashtag Listesi */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">
            <p className="text-sm">Hashtag'ler yüklenemedi.</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              Tekrar Dene
            </button>
          </div>
        ) : data?.hashtags && data.hashtags.length > 0 ? (
          <div className="space-y-4">
            {/* Tahmini Uyarısı */}
            {data.isEstimated && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <p className="text-xs text-yellow-300 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Bu hashtag'ler AI tarafından tahmin edilmiştir.</span>
                </p>
              </div>
            )}
            {!data.isEstimated && selectedPlatform === "x" && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                <p className="text-xs text-green-300 flex items-center gap-1">
                  <span>✓</span>
                  <span>Popüler hashtag verileri.</span>
                </p>
              </div>
            )}
            {!data.isEstimated && (selectedPlatform === "instagram" || selectedPlatform === "tiktok" || selectedPlatform === "linkedin") && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                <p className="text-xs text-green-300 flex items-center gap-1">
                  <span>✓</span>
                  <span>Popüler hashtag verileri.</span>
                </p>
              </div>
            )}

            {/* Hashtag Kartları */}
            <div className="space-y-2">
              {data.hashtags.map((hashtag, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-all duration-150 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-400">#{hashtag}</span>
                      {index < 3 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          index === 0 
                            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                            : index === 1
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            : "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                        }`}>
                          {index === 0 ? "🔥 #1" : index === 1 ? "⭐ #2" : "✨ #3"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Son Güncelleme Bilgisi */}
            {data.lastUpdated && (
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
                Son güncelleme: {formatLastUpdated(data.lastUpdated)}
                {data.cached && (
                  <span className="ml-2 text-green-400">✓ Cache'den</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Hashtag bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Bilgi Notu */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          {selectedPlatform === "x" 
            ? "X hashtag'leri Trends24'ten 1 saatte bir güncellenir."
            : selectedPlatform === "instagram"
            ? "Instagram hashtag'leri üçüncü taraf sitelerden 2 saatte bir güncellenir."
            : selectedPlatform === "tiktok"
            ? "TikTok hashtag'leri üçüncü taraf sitelerden 2 saatte bir güncellenir."
            : selectedPlatform === "linkedin"
            ? "LinkedIn hashtag'leri üçüncü taraf sitelerden 2 saatte bir güncellenir."
            : "Hashtag'ler AI tahmini ile 6 saatte bir güncellenir."
          }
        </p>
      </div>
    </aside>
  );
}

