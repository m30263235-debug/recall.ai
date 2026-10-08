# Recall — Smart Note-Taking & Second Brain

A production-grade Second Brain and multimodal knowledge synthesizer built with React, Vite, Tailwind CSS, TypeScript, and Express. Recall analyzes and transcribes video reels (YouTube, Instagram Reels, TikTok), captures mobile camera photos and documents, extracts structured item dossiers and specifications (e.g., budget IEM hardware, prices, and sound signatures), and organizes your knowledge with automated tag intelligence and spaced repetition retrieval.

---

## 🌟 Key Features

- **Multimodal Video & Reel Synthesis**:
  - Automatically parses and handles canonical URLs from YouTube, YouTube Shorts, and Instagram Reels (`/reel/`, `/reels/`, `/p/`).
  - Scrapes author handles, captions, and high-resolution thumbnails with social crawler fallback headers.
  - Extracts key takeaways, actionable insights, and structured item dossiers (item name, driver type, price range, verdict).
- **In-App Video Playback**:
  - Direct embedded player for YouTube videos and Shorts right inside note cards and detail modals.
- **Refined Editorial UI & UX**:
  - Clean typographic hierarchy adhering to anti-AI slop design principles and zero-pill discipline.
  - High-legibility light mode (`#F9F9F8` canvas) and dark mode (`#101114` obsidian) with seamless theme toggle.
  - Floating Quick Actions menu on every note card: **Pin to top**, **Text-to-Speech audio reader**, **Archive/Restore**, and **Delete**.
- **Spaced Retrieval & Recall Feed**:
  - Automatically resurfaces reviews and knowledge from 3, 7, and 14 days ago for proactive retention.
- **Media & Files Catalog**:
  - Dedicated gallery view for visual assets, screenshots, and attachments with filter tabs and lightbox zoom.
- **Second Brain AI Assistant**:
  - Grounded question-answering modal that searches across your notes, item dossiers, and source links.
- **Tag Intelligence & Management**:
  - Drawer for bulk tag renaming, merging, and deleting across notes with live filter indicators.
- **Cloud Sync & Firebase Authentication**:
  - Google Sign-In and real-time Firestore persistence with local backup.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend / API**: Express, Node.js, `@google/genai` (Gemini API with Google Search Grounding)
- **Database & Auth**: Firebase Firestore & Firebase Auth

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd <REPO_DIRECTORY>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📄 License

MIT License.
