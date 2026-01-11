# HireReady 技術架構文檔

## 專案概述

**名稱**：HireReady
**目標**：AI 驅動的語音面試模擬平台，幫助用戶練習行為面試
**比賽**：Zeabur "Ship It" Hackathon（第二賽道：Full-Stack Deployment）

---

## 技術選型決策

### 1. 前端框架：Next.js 16

**選擇原因**：

- App Router 原生支援
- Turbopack 加速開發
- React 19 完整相容
- 適合 Zeabur 部署

**注意事項**：

- Next.js 16 將 `middleware.ts` 改名為 `proxy.ts`
- 參考：[Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

### 2. UI 組件庫：HeroUI

**選擇原因**：

- 原 NextUI，社群活躍
- 基於 Tailwind CSS
- 支援 Tailwind CSS v4

**整合方式**：

```css
/* globals.css */
@import 'tailwindcss';
@source '../node_modules/@heroui/theme/dist/**/*.js';
```

### 3. 認證：Better Auth

**選擇原因**：

- Framework-agnostic
- 原生支援 Google OAuth
- JWT token 模式（stateless）
- 配置簡潔

**配置範例**：

```typescript
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});
```

### 4. AI 整合：Google Gemini Live API

**評估過的方案**：

| 方案                    | 複雜度 | 選擇                     |
| ----------------------- | ------ | ------------------------ |
| Google 官方 SDK 直連    | 低     | ✅ 選用                  |
| LiveKit + Gemini Plugin | 高     | 備選                     |
| Vercel AI SDK           | 中     | 不適用（實時語音不完整） |

**選用原因**：

- Google 提供官方 React 範例：[live-api-web-console](https://github.com/google-gemini/live-api-web-console)
- 架構最簡單，不需要額外服務
- 直接 WebSocket 連接 Gemini

**架構圖**：

```
┌─────────────┐    WebSocket    ┌──────────────────┐
│   Next.js   │ ◄────────────► │  Gemini Live API │
│   Frontend  │                 │  (Google Cloud)  │
└─────────────┘                 └──────────────────┘
```

**價格估算**（Gemini 2.5 Flash）：

- 音訊：25 tokens/秒
- 1 次 10 分鐘面試：約 $0.01-0.03

### 5. 國際化：next-intl

**選擇原因**：

- App Router 原生支援
- 類型安全
- 社群最活躍

**支援語言**：

- `zh-TW`（繁體中文）- 預設
- `en`（英文）

### 6. 狀態管理：Zustand

**選擇原因**：

- 輕量簡單
- 適合中小型專案
- 學習曲線低

### 7. 資料庫：PostgreSQL + Prisma

**選擇原因**：

- Zeabur 內建支援
- Prisma ORM 類型安全
- 適合未來擴展

### 8. 測試框架

| 類型     | 工具                     | 風格 |
| -------- | ------------------------ | ---- |
| 單元測試 | Vitest + Testing Library | BDD  |
| E2E 測試 | Playwright               | BDD  |

---

## 專案結構

```
hireready/
├── app/
│   ├── [locale]/           # i18n 路由
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── providers.tsx
│   │   ├── interview/      # 面試頁面
│   │   └── auth/           # 認證頁面
│   ├── api/                # API 路由
│   └── globals.css
├── components/
│   ├── ui/                 # UI 組件
│   ├── interview/          # 面試相關組件
│   └── layout/             # 佈局組件
├── lib/
│   ├── auth.ts             # Better Auth 設定
│   ├── gemini.ts           # Gemini Live API
│   ├── store.ts            # Zustand store
│   └── i18n/               # i18n 設定
├── messages/               # 翻譯檔案
│   ├── zh-TW.json
│   └── en.json
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/                   # 文檔
├── proxy.ts                # Next.js 16 路由代理
├── CLAUDE.md               # 開發規範
└── package.json
```

---

## 開發階段

### Phase 1: 專案初始化 ✅

- [x] Next.js 16 專案建立
- [x] HeroUI + Tailwind CSS v4
- [x] next-intl 國際化
- [x] Vitest + Playwright 測試
- [x] CLAUDE.md 開發規範

### Phase 2: 認證系統

- [ ] Better Auth + Google OAuth
- [ ] 登入/登出 UI
- [ ] JWT token 管理

### Phase 3: 核心面試功能

- [ ] Gemini Live API 整合
- [ ] 麥克風權限
- [ ] 視訊顯示
- [ ] AI 面試官角色
- [ ] 面試情境選擇

### Phase 4: UI/UX 優化

- [ ] 面試等待畫面
- [ ] 語音波形顯示
- [ ] 響應式設計

### Phase 5: 部署

- [ ] Zeabur 部署
- [ ] 環境變數設定
- [ ] 效能優化

---

## 參考資源

- [Gemini Live API Web Console](https://github.com/google-gemini/live-api-web-console)
- [Better Auth Docs](https://www.better-auth.com/)
- [HeroUI Docs](https://www.heroui.com/)
- [next-intl Docs](https://next-intl.dev/)
- [Zeabur Docs](https://zeabur.com/docs/)
- [Zeabur Hackathon Rules](https://memu.pro/hackathon/rules/zeabur)
