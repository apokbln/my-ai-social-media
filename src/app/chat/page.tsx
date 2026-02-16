"use client"; // eklemeyi unutma

import ChatSidebar from "@/components/ChatSidebar";
import ChatScreen from "@/components/ChatScreen";
import { useState } from "react";

export default function ChatPage() {
  const [chatId, setChatId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="py-4 px-6 bg-gray-800 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold text-center tracking-wider">
          SOSYAL MEDYA DANIŞMANIM🧠
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chatId={chatId}
          setChatId={setChatId}
        />
        <main className="flex-1 flex flex-col">
          {chatId ? (
            <ChatScreen chatId={chatId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">AI Sosyal Medya Danışmanı</h1>
                <p className="text-gray-400">
                  Başlamak için kenar çubuktan bir sohbet seçin veya yeni bir tane oluşturun.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
