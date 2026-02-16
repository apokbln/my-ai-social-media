"use client";

import useSWR, { mutate } from "swr";
import { Dispatch, SetStateAction, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  setChatId: Dispatch<SetStateAction<string | null>>;
  chatId: string | null;
}

export default function ChatSidebar({ setChatId, chatId }: Props) {
  const { data, error } = useSWR("/api/chats", fetcher);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const handleNewChat = () => {
    const newId = uuidv4();
    if (pathname === "/agenda") {
      router.push(`/?chatId=${newId}`);
    } else {
      setChatId(newId);
    }
    // Optimistically update the UI
    mutate("/api/chats", (currentData: any) => {
        return { chats: [...(currentData?.chats || []), newId] };
    }, false);
  };

  const handleChatSelect = (selectedChatId: string) => {
    if (pathname === "/agenda") {
      router.push(`/?chatId=${selectedChatId}`);
    } else {
      setChatId(selectedChatId);
    }
  };

  const handleDeleteChat = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/chats?chatId=${id}`, { method: "DELETE" });
    mutate("/api/chats");
    setDeletingId(null);
    if (chatId === id) setChatId(null);
  };

  if (error) return <div className="p-4 text-red-500">Hata: Geçmiş yüklenemedi.</div>;
  if (!data) return <div className="p-4 text-gray-300">Yükleniyor...</div>;

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 h-full overflow-y-auto border-r border-gray-700 shadow-xl flex flex-col">
      <div className="flex items-center justify-center mb-6">
        <span className="text-3xl mr-2">🧠</span>
        <h2 className="text-2xl font-extrabold tracking-wide">Danışmanım</h2>
      </div>
      <button
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 text-white bg-gradient-to-r from-green-400 to-blue-600 hover:from-blue-600 hover:to-green-400 focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-bold rounded-xl text-base px-6 py-3 mb-3 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <span className="text-xl">➕</span> Yeni Sohbet
      </button>
      <Link
        href="/agenda"
        className={`w-full flex items-center justify-center gap-2 text-white font-bold rounded-xl text-base px-6 py-3 mb-6 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          pathname === "/agenda"
            ? "bg-gradient-to-r from-blue-600 to-purple-600"
            : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500"
        }`}
      >
        <span className="text-xl">📅</span> Ajanda
      </Link>
      <ul className="space-y-3 flex-1 overflow-y-auto">
        {data?.chats?.map((chat: { chatId: string; title: string }, idx: number) => (
          <li key={chat.chatId ? chat.chatId : `chat-${idx}`}
              className="group">
            <button
              onClick={() => handleChatSelect(chat.chatId)}
              className={`w-full flex items-center px-4 py-3 rounded-xl shadow transition-all duration-150 text-left truncate border border-transparent group-hover:border-blue-400 group-hover:shadow-lg ${
                chatId === chat.chatId
                  ? "bg-blue-600 border-blue-400 scale-105"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <span className="truncate font-medium text-base">{chat.title}</span>
            </button>
            <button
              className="ml-2 text-gray-400 hover:text-red-500 transition text-lg"
              title="Sohbeti Sil"
              onClick={() => handleDeleteChat(chat.chatId)}
              disabled={deletingId === chat.chatId}
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
