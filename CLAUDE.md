# HireReady 開發規範

## 技術棧

- Next.js 16 + TypeScript + HeroUI + Tailwind CSS v4
- Better Auth (JWT) + Google OAuth
- Gemini 2.5 Flash Live API
- next-intl, Zustand, Prisma

## 開發指令

```bash
pnpm dev          # 開發伺服器
pnpm build        # 建置
pnpm test         # 單元測試
pnpm test:e2e     # E2E 測試
pnpm lint         # ESLint 檢查
```

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
