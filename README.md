# HireReady

**AI 驅動的語音面試模擬平台** - 幫助你練習行為面試，提升錄取機會！

[![CI](https://github.com/YOUR_USERNAME/hireready/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/hireready/actions/workflows/ci.yml)

## ✨ 功能特色

- 🎙️ **即時語音對話** - 使用 Google Gemini Live API 進行真實對話
- 🤖 **AI 面試官** - 模擬各種面試情境和風格
- 🌍 **多語言支援** - 繁體中文、英文
- 📊 **面試回饋** - 即時分析你的表現

## 🛠️ 技術棧

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: HeroUI + Tailwind CSS v4
- **AI**: Google Gemini Live API
- **Auth**: Better Auth (Google OAuth)
- **Database**: PostgreSQL + Prisma
- **Testing**: Vitest + Playwright
- **Deployment**: Zeabur

## 🚀 快速開始

### 環境需求

- Node.js 22+
- pnpm 10+

### 安裝

```bash
# Clone 專案
git clone https://github.com/YOUR_USERNAME/hireready.git
cd hireready

# 安裝依賴
pnpm install

# 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入你的 API keys

# 啟動開發伺服器
pnpm dev
```

打開 [http://localhost:5555](http://localhost:5555) 查看結果。

### 常用指令

| 指令              | 說明                       |
| ----------------- | -------------------------- |
| `pnpm dev`        | 啟動開發伺服器 (port 5555) |
| `pnpm build`      | 建置生產版本               |
| `pnpm lint`       | 執行 ESLint                |
| `pnpm format`     | 格式化程式碼               |
| `pnpm type-check` | TypeScript 類型檢查        |
| `pnpm test`       | 執行單元測試               |
| `pnpm test:e2e`   | 執行 E2E 測試              |

## 📁 專案結構

```
hireready/
├── app/                  # Next.js App Router
│   └── [locale]/         # i18n 路由
├── components/           # React 元件
├── lib/                  # 工具函數和設定
├── messages/             # i18n 翻譯檔案
├── tests/                # 測試檔案
└── docs/                 # 文檔
```

## 📝 開發規範

- Commit 訊息遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- 詳見 [CLAUDE.md](./CLAUDE.md) 了解完整開發規範

## 📄 License

MIT License
