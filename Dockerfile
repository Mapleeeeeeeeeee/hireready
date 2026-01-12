# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (dummy env vars for build-time validation)
ENV BETTER_AUTH_URL="http://localhost:5555"
ENV BETTER_AUTH_SECRET="build-time-secret-placeholder"
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN pnpm build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy custom server files (override default server.js)
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma

# Copy node_modules for tsx and runtime deps
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 5555

ENV PORT=5555
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "tsx", "server.ts"]
