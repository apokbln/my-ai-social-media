"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import ChatSidebar from "@/components/ChatSidebar";
import TrendHashtagsSidebar from "@/components/TrendHashtagsSidebar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AgendaItem {
  _id: string;
  date: string;
  title: string;
  content: string;
  platform: string;
  createdAt: string;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    title: "",
    content: "",
    platform: "instagram",
  });

  const { data, error, isLoading } = useSWR<{ items: AgendaItem[] }>(
    `/api/agenda?date=${selectedDate}`,
    fetcher
  );

  // Tüm kayıtları çek (takvim için)
  const { data: allData } = useSWR<{ items: AgendaItem[] }>(
    `/api/agenda?all=true`,
    fetcher
  );

  const items = data?.items || [];
  const allItems = allData?.items || [];

  // Yerel tarihi YYYY-MM-DD formatına çevir (timezone sorunlarını önlemek için)
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Tarih string'ini YYYY-MM-DD formatına çevir (timezone sorunlarını önlemek için)
  const normalizeDateString = (dateString: string): string => {
    const date = new Date(dateString);
    return formatDateToLocal(date);
  };

  // Tarih bazında kayıt sayısını hesapla
  const getItemsByDate = (dateString: string): number => {
    const normalizedDate = normalizeDateString(dateString);
    return allItems.filter((item) => {
      const itemDateNormalized = normalizeDateString(item.date);
      return itemDateNormalized === normalizedDate;
    }).length;
  };

  const handleOpenModal = (item?: AgendaItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        date: normalizeDateString(item.date),
        title: item.title,
        content: item.content,
        platform: item.platform,
      });
    } else {
      setEditingItem(null);
      setFormData({
        date: selectedDate,
        title: "",
        content: "",
        platform: "instagram",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      date: selectedDate,
      title: "",
      content: "",
      platform: "instagram",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Güncelleme
        await fetch(`/api/agenda/${editingItem._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        // Yeni kayıt
        await fetch("/api/agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      mutate(`/api/agenda?date=${selectedDate}`);
      mutate(`/api/agenda?all=true`);
      handleCloseModal();
    } catch (error) {
      console.error("Kayıt işlemi başarısız:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

    try {
      await fetch(`/api/agenda/${id}`, { method: "DELETE" });
      mutate(`/api/agenda?date=${selectedDate}`);
      mutate(`/api/agenda?all=true`);
    } catch (error) {
      console.error("Silme işlemi başarısız:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📷",
      tiktok: "🎵",
      x: "🐦",
      youtube: "▶️",
    };
    return icons[platform.toLowerCase()] || "📱";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Takvim için yardımcı fonksiyonlar
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Önceki ayın son günleri
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
      });
    }
    
    // Mevcut ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Sonraki ayın ilk günleri (takvimi tamamlamak için)
    const remainingDays = 42 - days.length; // 6 hafta x 7 gün
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    const dateString = formatDateToLocal(date);
    setSelectedDate(dateString);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    const dateString = formatDateToLocal(date);
    return dateString === selectedDate;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
      <header className="py-4 px-6 bg-gray-800 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold text-center tracking-wider">
          SOSYAL MEDYA DANIŞMANIM🧠
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar chatId={null} setChatId={() => {}} />
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold">Tarih Seç:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-600 hover:to-green-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span>➕</span> Yeni Kayıt Ekle
            </button>
          </div>

          {/* Takvim Görünümü */}
          <div className="mb-8 bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                ←
              </button>
              <h2 className="text-xl font-bold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {/* Hafta günleri başlıkları */}
              {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                  {day}
                </div>
              ))}
              {/* Takvim günleri */}
              {calendarDays.map((day, idx) => {
                const dateString = formatDateToLocal(day.date);
                const itemCount = getItemsByDate(dateString);
                const hasItems = itemCount > 0;
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(day.date)}
                    className={`
                      aspect-square p-2 rounded-lg transition-all duration-150
                      ${!day.isCurrentMonth ? "text-gray-600" : "text-white"}
                      ${isToday(day.date) ? "ring-2 ring-blue-500" : ""}
                      ${isSelected(day.date) ? "bg-blue-600 text-white font-bold" : "hover:bg-gray-700"}
                      ${hasItems && day.isCurrentMonth ? "bg-gradient-to-br from-green-500 to-blue-500 text-white font-semibold" : ""}
                      ${hasItems && !day.isCurrentMonth ? "bg-gray-700 text-gray-400" : ""}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{day.date.getDate()}</span>
                      {hasItems && (
                        <span className="text-xs mt-1">({itemCount})</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">
              Hata: Kayıtlar yüklenemedi.
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-xl mb-2">Bu tarihte kayıt bulunmuyor.</p>
              <p>Yeni bir kayıt eklemek için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-700 hover:border-blue-400 transition-all duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {getPlatformIcon(item.platform)}
                      </span>
                      <span className="text-xs font-semibold text-blue-400 uppercase">
                        {item.platform}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                    {item.content}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <TrendHashtagsSidebar />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingItem ? "Kayıt Düzenle" : "Yeni Kayıt Ekle"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Tarih
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Başlık
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="İçerik başlığı"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="x">X (Twitter)</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  İçerik
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  rows={6}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Detaylı içerik fikri..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-600 hover:to-green-400 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {editingItem ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

