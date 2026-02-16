"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Message {
  _id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  chatId: string;
}

const defaultMessage: Message = {
    role: "assistant",
    content: `👋 Merhaba! Ben sosyal medya danışmanınızım.

Bana paylaşmak istediğiniz konuyu, hedef kitlenizi veya platformunuzu (Instagram, Twitter, LinkedIn vb.) anlatın. Size özgün içerik fikirleri, paylaşım zamanı ve etkili hashtag önerileriyle yardımcı olabilirim!

Hadi başlayalım 🚀`
};

export default function ChatScreen({ chatId }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [offset, setOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLength = useRef<number>(0);
  const prevScrollHeight = useRef<number>(0);
  
  // Ajandaya ekleme için state'ler
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{ content: string; title: string } | null>(null);
  const [agendaDate, setAgendaDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [agendaPlatform, setAgendaPlatform] = useState<string>("instagram");
  const [isAddingToAgenda, setIsAddingToAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [showDateConflictModal, setShowDateConflictModal] = useState(false);
  const [dateHasItems, setDateHasItems] = useState(false);

  const { data, error, isValidating } = useSWR(
    chatId ? `/api/history?chatId=${chatId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([defaultMessage]);
        }
      },
    }
  );

  useEffect(() => {
    if (!chatId) {
      setMessages([defaultMessage]);
      return;
    }
    if (isValidating) {
      setMessages([defaultMessage]);
      return;
    }
    if (data?.messages && data.messages.length > 0) {
      setMessages(data.messages);
    } else if (data && (!data.messages || data.messages.length === 0)) {
      setMessages([defaultMessage]);
    }
  }, [chatId, data, isValidating]);

  const fetchMessages = useCallback(async (newOffset = 0, append = false) => {
    setIsLoadingMore(true);
    if (append && messagesContainerRef.current) {
      prevScrollHeight.current = messagesContainerRef.current.scrollHeight;
    }
    const res = await fetch(`/api/history?chatId=${chatId}&limit=${PAGE_SIZE}&offset=${newOffset}`);
    const data = await res.json();
    if (data?.messages) {
      setTotalMessages(data.total || 0);
      setHasMore((newOffset + PAGE_SIZE) < (data.total || 0));
      if (append) {
        setMessages((prev) => [...data.messages, ...prev]);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - prevScrollHeight.current;
          }
        }, 0);
      } else {
        setMessages(data.messages);
      }
    }
    setIsLoadingMore(false);
  }, [chatId]);

  useEffect(() => {
    setOffset(0);
    fetchMessages(0, false);
  }, [chatId, fetchMessages]);

  useEffect(() => {
    // Sadece yeni mesaj eklendiğinde ve autoScroll true ise scroll
    if (messages.length > prevMessagesLength.current && autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages, autoScroll]);

  // Scroll pozisyonunu takip et
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    if (isAtBottom) {
      setAutoScroll(true);
    } else {
      setAutoScroll(false);
    }
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      const newOffset = offset + PAGE_SIZE;
      setOffset(newOffset);
      const prevHeight = e.currentTarget.scrollHeight;
      await fetchMessages(newOffset, true);
      // Scroll pozisyonunu koru
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - prevHeight;
        }
      }, 0);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;

    setIsLoading(true);
    setInput("");
    setAutoScroll(true);

    try {
      // Tüm geçmişi çek (limit olmadan)
      const historyRes = await fetch(`/api/history?chatId=${chatId}`); // limit yok!
      const historyData = await historyRes.json();
      let historyMessages = historyData?.messages || [];
      // Default AI mesajını hariç tut
      historyMessages = historyMessages.filter((m: Message) => !(m.role === 'assistant' && m.content === defaultMessage.content));
      // Yeni user mesajını ekle
      const userMessage: Message = { role: "user", content: input };
      const messagesToSend = [...historyMessages, userMessage];
      setMessages(messagesToSend);

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend, chatId }),
      });
      // Mesaj gönderildikten sonra güncel mesajları çek (sayfalı)
      await fetchMessages(0, false);
      setOffset(0);
      mutate(`/api/history?chatId=${chatId}`); 
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      setMessages(prev => ([...prev, { role: "assistant", content: "Bir hata oluştu, lütfen tekrar deneyin." }]));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) sendMessage();
  };

  // İçeriği ajandaya ekleme fonksiyonu
  const handleAddToAgenda = async (content: string) => {
    // İçerikten başlık oluştur (ilk 50 karakter)
    const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
    const today = new Date().toISOString().split("T")[0];
    setSelectedContent({ content, title });
    setAgendaDate(today);
    setAgendaPlatform("instagram");
    setAgendaError(null);
    setIsAgendaModalOpen(true);
    // İlk açılışta bugünün tarihini kontrol et
    await checkDateForItems(today);
  };

  const handleCloseAgendaModal = () => {
    setIsAgendaModalOpen(false);
    setSelectedContent(null);
    setAgendaError(null);
    setShowDateConflictModal(false);
    setDateHasItems(false);
  };

  // Seçilen tarihte içerik olup olmadığını kontrol et
  const checkDateForItems = async (date: string) => {
    try {
      const response = await fetch(`/api/agenda?date=${date}`);
      const data = await response.json();
      const hasItems = data?.items && data.items.length > 0;
      setDateHasItems(hasItems);
      return hasItems;
    } catch (error) {
      console.error("Tarih kontrolü hatası:", error);
      return false;
    }
  };

  // Tarih değiştiğinde kontrol et
  const handleDateChange = async (newDate: string) => {
    setAgendaDate(newDate);
    await checkDateForItems(newDate);
  };

  const handleSaveToAgenda = async (skipConfirmation = false) => {
    if (!selectedContent) return;

    // Eğer tarihte içerik varsa ve onay alınmadıysa, onay modalını göster
    if (!skipConfirmation && dateHasItems) {
      setShowDateConflictModal(true);
      return;
    }

    setIsAddingToAgenda(true);
    setAgendaError(null);
    setShowDateConflictModal(false);

    try {
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: agendaDate,
          title: selectedContent.title,
          content: selectedContent.content,
          platform: agendaPlatform,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Duplicate içerik
          setAgendaError("Bu içerik daha önce ajandaya eklenmiştir.");
          return;
        }
        throw new Error(data.error || "Ajandaya eklenirken bir hata oluştu.");
      }

      // Başarılı
      handleCloseAgendaModal();
      // Ajanda sayfasını güncelle (eğer açıksa)
      mutate("/api/agenda?all=true");
      
      // Başarı mesajı göster (opsiyonel - toast notification eklenebilir)
      alert("İçerik başarıyla ajandaya eklendi! 📅");
    } catch (error: any) {
      console.error("Ajandaya ekleme hatası:", error);
      setAgendaError(error.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsAddingToAgenda(false);
    }
  };

  // Default mesajı kontrol et
  const isDefaultMessage = (content: string): boolean => {
    return content === defaultMessage.content || content.includes("👋 Merhaba! Ben sosyal medya danışmanınızım");
  };

  // Render edilecek mesajlar: hiç mesaj yoksa sadece default mesajı göster
  const displayMessages = messages.length > 0 ? messages : [defaultMessage];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-4 sm:p-8 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900">
      <div
        className="flex-1 min-h-0 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto space-y-4 p-2 sm:p-4 bg-gray-800/80 rounded-2xl shadow-2xl border border-gray-700"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ minHeight: 0 }}
      >
        {isLoadingMore && (
          <div className="text-center text-gray-400 text-xs py-2">Daha fazla mesaj yükleniyor...</div>
        )}
        {displayMessages.map((msg, idx) => {
          const showAddButton = msg.role === "assistant" && !isDefaultMessage(msg.content);
          
          return (
            <div
              key={msg._id || idx}
              className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <span className="text-2xl select-none">🤖</span>
                )}
                <div
                  className={`max-w-[70vw] sm:max-w-[55%] px-5 py-3 rounded-3xl shadow-lg text-base whitespace-pre-wrap break-words border transition-all duration-150 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-400 text-white border-blue-400"
                      : "bg-gradient-to-br from-gray-100 to-gray-300 text-gray-900 border-gray-300"
                  }`}
                >
                  <span className={`font-bold text-sm ${msg.role === "user" ? "text-white" : "text-blue-700"}`}>
                    {msg.role === "user" ? "Siz" : "AI Danışmanınız"}:
                  </span>
                  <p className="mt-1 leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <span className="text-2xl select-none">🧑‍💻</span>
                )}
              </div>
              {showAddButton && (
                <button
                  onClick={() => handleAddToAgenda(msg.content)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold shadow-md transition-all duration-200 hover:scale-105 ml-12"
                >
                  <span>📅</span> Ajandaya Ekle
                </button>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-end gap-2 justify-start">
            <span className="text-2xl select-none">🤖</span>
            <div className="max-w-[75%] px-5 py-3 rounded-3xl shadow-lg text-base whitespace-pre-wrap break-words bg-gray-900 text-white border border-gray-700">
              <span className="font-bold">AI Danışman:</span>
              <p className="mt-1">Yazıyor...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="mt-6 flex gap-2 items-center bg-gray-800/80 rounded-2xl shadow-lg p-3 border border-gray-700"
        onSubmit={e => { e.preventDefault(); sendMessage(); }}
      >
        <input
          className="flex-1 rounded-xl px-5 py-3 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition text-base shadow-inner"
          placeholder="Mesajınızı buraya yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-7 py-3 rounded-xl font-bold text-base shadow-lg hover:from-blue-600 hover:to-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200"
        >
          Gönder
        </button>
      </form>

      {/* Ajandaya Ekle Modal */}
      {isAgendaModalOpen && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📅 Ajandaya Ekle</h2>
              <button
                onClick={handleCloseAgendaModal}
                className="text-gray-400 hover:text-white text-2xl"
                disabled={isAddingToAgenda}
              >
                ✕
              </button>
            </div>

            {agendaError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {agendaError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Tarih Seç
                </label>
                <input
                  type="date"
                  value={agendaDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  disabled={isAddingToAgenda}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {dateHasItems && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ Bu tarihte zaten bir içerik bulunmaktadır.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Platform
                </label>
                <select
                  value={agendaPlatform}
                  onChange={(e) => setAgendaPlatform(e.target.value)}
                  required
                  disabled={isAddingToAgenda}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="x">X (Twitter)</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  İçerik Önizleme
                </label>
                <div className="p-3 bg-gray-700 rounded-lg text-sm text-gray-300 max-h-32 overflow-y-auto">
                  {selectedContent.content.substring(0, 200)}
                  {selectedContent.content.length > 200 && "..."}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAgendaModal}
                  disabled={isAddingToAgenda}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveToAgenda}
                  disabled={isAddingToAgenda}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-600 hover:to-green-400 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingToAgenda ? "Ekleniyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarih Çakışması Onay Modalı */}
      {showDateConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-center mb-4">
              Tarih Uyarısı
            </h2>
            <p className="text-gray-300 text-center mb-6">
              Seçtiğiniz tarihte bir içerik bulunmaktadır. Yine de eklemek istiyor musunuz?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDateConflictModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition"
              >
                Hayır
              </button>
              <button
                type="button"
                onClick={() => handleSaveToAgenda(true)}
                disabled={isAddingToAgenda}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-600 hover:to-green-400 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Evet, Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
