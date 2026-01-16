# HireReady

[English](./README.md) | **繁體中文**

**AI 驅動的語音面試模擬平台** - 幫助你練習面試，透過真實對話提升錄取機會！

[![CI](https://github.com/Mapleeeeeeeeeee/hireready/actions/workflows/ci.yml/badge.svg)](https://github.com/Mapleeeeeeeeeee/hireready/actions/workflows/ci.yml)

---

## 🏆 關於專案

本專案是為 **Zeabur "Ship It" Hackathon** (Track 2: Full-Stack Deployment) 所開發的作品。我們利用 Next.js 16 與 Google Gemini Live API，打造了一個能進行「全語音即時對話」的模擬面試平台，並透過 Zeabur 進行部署與自動化維運。

- **Live Demo**: [https://hireready.zeabur.app](https://hireready.zeabur.app) (Host on Zeabur)

## ✨ 主要功能

- 🎙️ **即時語音對話**：使用 Google Gemini Live API (WebSocket) 進行低延遲、自然的語音互動，無需按按鈕說話。
- 🤖 **AI 面試官人格**：模擬真實面試官的語氣與追問技巧，支援自訂職位描述 (JD) 進行針對性練習。
- 🌍 **多語言支援**：完整支援繁體中文 (zh-TW) 與英文 (en) 介面及對話。
- 📊 **即時回饋**：面試結束後，AI 會針對你的回答內容、溝通技巧給予詳細建議與評分。
- 🔐 **安全認證**：整合 Better Auth 與 Google OAuth，並確保用戶資料安全。
- 📱 **響應式設計**：使用 HeroUI + Tailwind CSS v4，在桌面與行動裝置上皆有完美體驗。

## 🛠️ 技術棧 (Tech Stack)

- **Frontend Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI Library**: HeroUI (NextUI) + Tailwind CSS v4
- **AI Model**: Google Gemini Live API (Gemini 2.5 Flash via WebSocket)
- **Authentication**: Better Auth (Google OAuth)
- **Database**: PostgreSQL (Managed by Zeabur)
- **ORM**: Prisma
- **Queue/Cache**: Redis (Managed by Zeabur)
- **Testing**: Vitest (Unit) + Playwright (E2E)
- **Deployment**: Zeabur (Serverless + Docker)

## ⚡ Zeabur 特色功能應用 (Zeabur Highlights)

本專案充分利用了 Zeabur 的原生功能，實現高效部署與穩定運行：

- **Declarative Configuration**: 使用 `zeabur.yaml` 定義完整的微服務架構 (Next.js + Postgres + Redis)，實現 Infrastructure as Code。
- **Private Networking**: 利用 Zeabur 內網連線機制 (Service Linking)，讓 Next.js 透過內部私有域名存取資料庫與 Redis，確保安全性並降低延遲。
- **Automatic CI/CD**: 綁定 GitHub 後，每次 Push 自動觸發建置與部署，實現無縫更版。

## 🚀 部署教學 (Deployment)

本專案已針對 **Zeabur** 進行深度優化，可依下列步驟部署。

### 手動部署

1. 在 [Zeabur Dashboard](https://dash.zeabur.com) 建立新專案。
2. 建立 PostgreSQL 與 Redis 服務。
3. 建立 Service，選擇 "Git"，連結此儲存庫，並透過 Service Linking 連結資料庫與 Redis。
4. **設定環境變數**：在 Zeabur Dashboard 的 User Service 中設定以下變數：
   - `GOOGLE_CLIENT_ID`: Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
   - `GEMINI_API_KEY`: Google Gemini API Key
   - `BETTER_AUTH_SECRET`: Generate a random string
   - `BETTER_AUTH_URL`: 你的 Zeabur 網域 (例如 `https://your-app.zeabur.app`)
   - `NEXT_PUBLIC_APP_URL`: 同上
     _註：`DATABASE_URL` 與 `REDIS_URL` 會由 Zeabur Service Linking 自動注入，無需手動設定。_
5. 等待部署完成，即可開始使用！

## 💻 本地開發 (Local Development)

### 環境需求

- Node.js 22+
- pnpm 10+

### 安裝步驟

1. **Clone 專案**

   ```bash
   git clone https://github.com/Mapleeeeeeeeeee/hireready.git
   cd hireready
   ```

2. **安裝依賴**

   ```bash
   pnpm install
   ```

3. **設定環境變數**
   複製 `.env.example` 並填入你的 API Keys：

   ```bash
   cp .env.example .env.local
   ```

4. **啟動資料庫 (Optional)**
   如果你本地沒有 Postgres，可以使用 Docker 啟動：

   ```bash
   docker-compose up -d
   ```

5. **初始化資料庫**

   ```bash
   pnpm prisma migrate dev
   ```

6. **啟動開發伺服器**
   ```bash
   pnpm dev
   ```
   瀏覽器打開 [http://localhost:5555](http://localhost:5555) 即可看到畫面。

## 📁 專案結構

```
hireready/
├── app/                  # Next.js App Router 頁面與 API
├── components/           # React UI 組件 (HeroUI)
├── lib/
│   ├── gemini/           # Gemini Live API 整合邏輯
│   ├── stores/           # Zustand 狀態管理
│   └── prisma/           # 資料庫連線
├── messages/             # i18n 翻譯檔案 (en, zh-TW)
├── prisma/               # Database Schema
├── public/               # 靜態資源
└── zeabur.yaml           # Zeabur 部署配置
```

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
