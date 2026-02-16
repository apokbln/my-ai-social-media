"use client";

import ChatSidebar from "@/components/ChatSidebar";
import ChatScreen from "@/components/ChatScreen";
import TrendHashtagsSidebar from "@/components/TrendHashtagsSidebar";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    const urlChatId = searchParams.get("chatId");
    if (urlChatId) {
      setChatId(urlChatId);
    }
  }, [searchParams]);

  const handleSetChatId = (id: string | null | ((prev: string | null) => string | null)) => {
    const newChatId = typeof id === "function" ? id(chatId) : id;
    setChatId(newChatId);
    if (newChatId) {
      router.replace(`/?chatId=${newChatId}`, { scroll: false });
    } else {
      router.replace("/", { scroll: false });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="py-4 px-6 bg-gray-800 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold text-center tracking-wider">
          SOSYAL MEDYA DANIŞMANIM🧠
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar chatId={chatId} setChatId={handleSetChatId} />
        <main className="flex-1 flex flex-col">
          {chatId ? (
            <ChatScreen chatId={chatId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">
                  AI Sosyal Medya Danışmanı
                </h1>
                <p className="text-gray-400">
                  Başlamak için kenar çubuktan bir sohbet seçin veya yeni bir
                  tane oluşturun.
                </p>
              </div>
            </div>
          )}
        </main>
        <TrendHashtagsSidebar />
      </div>
    </div>
  );
}
