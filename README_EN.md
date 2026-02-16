# 🤖 AI-Powered Social Media Consultant

An AI-powered social media consulting web application designed to help users generate, plan, and optimize social media content efficiently.

---

## 🚀 About The Project

This application is a web-based social media consultant system developed using the OpenAI ChatGPT API.

Users can generate platform-specific content ideas by providing:

* Target social media platform (Instagram, X, LinkedIn, etc.)
* Target audience
* Content purpose

In addition to content generation, the system also provides content planning, trend hashtag analysis, and content history management features.

---

## ✨ Features

### 🧠 AI-Powered Content Generation

* Platform-specific content creation
* Tone and purpose-aware text generation
* Alternative content variations

### 💬 Chat-Based Consulting

* Natural language interaction
* Real-time content suggestions
* Personalized responses

### 📅 Content Scheduler (Agenda)

* Schedule generated content for future dates
* Date-based content storage
* View content history

### 📈 Trend Hashtag System

* Fetches data from third-party hashtag analytics websites
* Updates trend data every 2 hours
* Cached in MongoDB
* Platform-based hashtag suggestions

---

## 🏗️ System Architecture

The application follows a modular web architecture:

* **Frontend:** Next.js + Tailwind CSS
* **Backend:** Next.js API Routes
* **AI Integration:** OpenAI ChatGPT API
* **Database:** MongoDB
* **Caching:** Time-based cache mechanism (2-hour refresh)

---

## 🔄 Workflow

1. User enters content parameters
2. Backend sends request to OpenAI API
3. AI generates content
4. User optionally saves content to scheduler
5. Trend hashtags are fetched from database
6. All records are stored in MongoDB

---

## 🛠️ Installation

```bash
git clone https://github.com/apokbln/project-name.git
cd project-name
npm install
npm run dev
```

### Environment Variables

Create `.env.local` file:

```
OPENAI_API_KEY=your_api_key
MONGODB_URI=your_mongodb_connection
```

---

## 📌 Technical Notes

* The AI model is not trained from scratch; inference-based API usage is applied.
* Trend hashtags are retrieved from external sources and cached periodically.
* Caching mechanism is used to improve performance and reduce external requests.

---

## 🎯 Project Objective

The main goal of this project is to help social media users:

* Generate content faster
* Plan posts efficiently
* Follow current trends
* Build better social media strategies

---

## 📌 Future Improvements

* User feedback–based adaptive content generation
* Content quality scoring system
* Platform-based performance analytics

---

## 👨‍💻 Developer

Abdullah Kablan
Software Engineering Student