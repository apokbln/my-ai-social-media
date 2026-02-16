# 🤖 AI-Powered Social Media Consultant

Yapay zekâ destekli sosyal medya danışman uygulaması.
Kullanıcıların içerik üretimini kolaylaştırmak, planlamak ve optimize etmek için geliştirilmiştir.

---

## 🚀 Proje Hakkında

Bu uygulama, OpenAI ChatGPT API kullanılarak geliştirilmiş web tabanlı bir sosyal medya danışman sistemidir.

Kullanıcılar:

* Platform (Instagram, X, LinkedIn vb.)
* Hedef kitle
* İçerik amacı

bilgilerini girerek bağlama uygun içerik önerileri alabilirler.

Sistem yalnızca içerik üretmekle kalmaz; içerik planlama, trend hashtag analizi ve geçmiş kayıt yönetimi gibi özellikler de sunar.

---

## ✨ Özellikler

### 🧠 Yapay Zekâ Destekli İçerik Üretimi

* Platforma özel içerik oluşturma
* Ton ve amaç odaklı metin üretimi
* Alternatif içerik varyasyonları

### 💬 Sohbet Tabanlı Danışmanlık

* Doğal dil ile etkileşim
* Gerçek zamanlı içerik önerisi
* Kullanıcı parametrelerine göre özelleştirme

### 📅 Ajanda & İçerik Planlama

* Üretilen içerikleri ileri tarihli planlama
* Tarih bazlı kayıt tutma
* İçerik geçmişini görüntüleme

### 📈 Trend Hashtag Sistemi

* Harici hashtag analiz sitelerinden veri çekme
* 2 saatte bir güncellenen trend verileri
* MongoDB üzerinde cache mekanizması
* Platform bazlı hashtag önerisi

---

## 🏗️ Sistem Mimarisi

Uygulama modüler bir web mimarisi ile geliştirilmiştir:

* **Frontend:** Next.js + Tailwind CSS
* **Backend:** Next.js API Routes
* **AI Entegrasyonu:** OpenAI ChatGPT API
* **Veritabanı:** MongoDB
* **Cache Mekanizması:** Zaman tabanlı veri saklama (2 saatlik güncelleme)

---

## 🔄 Çalışma Mantığı

1. Kullanıcı içerik parametrelerini girer.
2. Backend, girdileri OpenAI API’ye iletir.
3. Yapay zekâ içerik üretir.
4. Kullanıcı isterse içeriği ajandaya ekler.
5. Trend hashtag sistemi, güncel verileri veritabanından çeker.
6. İçerikler MongoDB üzerinde saklanır.

---

## 🛠️ Kurulum

```bash
git clone https://github.com/apokbln/my-ai-social-media.git
cd proje-adi
npm install
npm run dev
```

### Environment Variables

`.env.local` dosyasına:

```
OPENAI_API_KEY=your_api_key
MONGODB_URI=your_mongodb_connection
```

---

## 📌 Teknik Notlar

* Yapay zekâ modeli sıfırdan eğitilmemiştir; inference odaklı API kullanımı yapılmıştır.
* Trend hashtag verileri yapay zekâ tarafından üretilmemekte, harici kaynaklardan çekilerek periyodik olarak güncellenmektedir.
* Sistem performansı için cache mantığı uygulanmıştır.

---

## 🎯 Proje Amacı

Bu proje, sosyal medya kullanıcılarının:

* Daha hızlı içerik üretmesini
* Planlı paylaşım yapmasını
* Trendleri takip etmesini
* Stratejik içerik üretmesini

sağlamak amacıyla geliştirilmiştir.

---

## 📌 Gelecek Geliştirmeler

* Kullanıcı geri bildirimine dayalı içerik adaptasyonu
* İçerik kalite puanlama sistemi
* Platform bazlı performans analizi

---

## 👨‍💻 Geliştirici

Abdullah Kablan
Yazılım Mühendisliği Öğrencisi
