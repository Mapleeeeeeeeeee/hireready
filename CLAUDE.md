# HireReady 開發規範

## 專案目的

參加 `https://memu.pro/hackathon/rules/zeabur` 的專案，裡面有提到評分規則跟加分項，開發時請注意

## 技術棧

- Next.js 16 + TypeScript + HeroUI + Tailwind CSS v4
- Better Auth (JWT) + Google OAuth
- Gemini 2.5 Flash Live API
- next-intl, Zustand, Prisma

## 開發指令

```bash
pnpm dev          # 開發伺服器 (port 5555)
pnpm build        # 建置
pnpm test         # 單元測試
pnpm test:e2e     # E2E 測試
pnpm lint         # ESLint 檢查
pnpm prisma studio # Prisma 資料庫管理
```

## 環境變數規範

**禁止直接使用 `process.env`**，必須透過統一的 config 導出：

| 檔案                   | 用途             | 指令           |
| ---------------------- | ---------------- | -------------- |
| `lib/config/server.ts` | 伺服器端環境變數 | `'use server'` |
| `lib/config/client.ts` | 客戶端環境變數   | `'use client'` |
| `lib/config/index.ts`  | 共用靜態設定     | 無需指令       |

```typescript
// ✅ 正確用法
import { serverEnv } from '@/lib/config/server';
const apiKey = serverEnv.geminiApiKey;

// ❌ 錯誤用法
const apiKey = process.env.GEMINI_API_KEY;
```

**注意**：

- Client 端只能存取 `NEXT_PUBLIC_` 開頭的變數
- Server 端敏感資訊（API keys, secrets）絕對不能暴露給 client

## 測試規範（BDD）

- 單元測試：Vitest + Testing Library
- E2E 測試：Playwright
- 檔案命名：`*.test.ts` / `*.spec.ts`
- 使用 `describe/it` 風格

## 程式碼規範

- TypeScript strict mode
- 元件：PascalCase
- 函數：camelCase
- 所有文字使用 i18n key

## Git Commit

格式：`type(scope): message`
Types: feat, fix, docs, style, refactor, test, chore
