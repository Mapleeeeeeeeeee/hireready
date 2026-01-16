# HireReady

**English** | [繁體中文](./README.zh-TW.md)

**AI-Powered Voice Interview Platform** - Master your interviews with real-time, voice-based practice!

[![CI](https://github.com/Mapleeeeeeeeeee/hireready/actions/workflows/ci.yml/badge.svg)](https://github.com/Mapleeeeeeeeeee/hireready/actions/workflows/ci.yml)
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/https://github.com/Mapleeeeeeeeeee/hireready)

---

## 🏆 About The Project

This project was built for the **Zeabur "Ship It" Hackathon** (Track 2: Full-Stack Deployment). We leveraged Next.js 16 and the Google Gemini Live API to create an immersive, full-duplex voice interview simulation platform, deployed seamlessly via Zeabur.

- **Live Demo**: [https://hireready.zeabur.app](https://hireready.zeabur.app) (Hosted on Zeabur)

## ✨ Key Features

- 🎙️ **Real-time Voice Conversation**: Powered by Google Gemini Live API (WebSocket) for low-latency, natural interactions without push-to-talk.
- 🤖 **AI Interviewer Persona**: Simulates realistic interviewer tones and follow-up questions. Supports custom Job Descriptions (JD) for targeted practice.
- 🌍 **Multi-language Support**: Fully supports English (en) and Traditional Chinese (zh-TW) for both UI and conversation.
- 📊 **Instant Feedback**: Receive detailed analysis on your content, communication style, and scores immediately after the interview.
- 🔐 **Secure Authentication**: Integrated with Better Auth and Google OAuth for secure user management.
- 📱 **Responsive Design**: Built with HeroUI + Tailwind CSS v4, ensuring a premium experience on desktop and mobile.

## 🛠️ Tech Stack

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

## ⚡ Zeabur Highlights

We maximized Zeabur's native features for optimal performance and developer experience:

- **Declarative Configuration**: utilized `zeabur.yaml` to define the entire microservices architecture (Next.js + Postgres + Redis) as Infrastructure as Code.
- **Private Networking**: Leveraged Zeabur's internal service linking to connect Next.js securely to Postgres and Redis via private endpoints, ensuring low latency and high security.
- **Automatic CI/CD**: Seamless automated builds and deployments triggered by every GitHub push.

## 🚀 Deployment

The project is optimized for **Zeabur**, offering a hassle-free deployment experience.

### Option 1: One-Click Deploy (Recommended)

1. Click the **Deploy on Zeabur** button below:

   [![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/https://github.com/Mapleeeeeeeeeee/hireready)

2. Log in to Zeabur and authorize GitHub access.
3. Zeabur will automatically detect the `zeabur.yaml` configuration and create three services:
   - **User Service**: The Next.js application (Dockerized).
   - **PostgreSQL**: Managed database service.
   - **Redis**: Managed cache/queue service.
4. **Configure Environment Variables**: In the Zeabur Dashboard (User Service), set the following:
   - `GOOGLE_CLIENT_ID`: Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
   - `GEMINI_API_KEY`: Google Gemini API Key
   - `BETTER_AUTH_SECRET`: Generate a random string
   - `BETTER_AUTH_URL`: Your Zeabur domain (e.g., `https://your-app.zeabur.app`)
   - `NEXT_PUBLIC_APP_URL`: Same as above
     _Note: `DATABASE_URL` and `REDIS_URL` are automatically injected by Zeabur Service Linking._
5. Wait for the deployment to finish and you are ready to go!

### Option 2: Manual Deployment

1. Create a new project in the [Zeabur Dashboard](https://dash.zeabur.com).
2. Create PostgreSQL and Redis services from the marketplace.
3. Create a new Service, select "Git", and connect this repository.
4. Set the environment variables mentioned above and connect your database/Redis using Service Linking (this will automatically inject `DATABASE_URL` and `REDIS_URL`).

## 💻 Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Mapleeeeeeeeeee/hireready.git
   cd hireready
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env.local` and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

4. **Start Database (Optional)**
   If you don't have a local Postgres instance, you can use Docker:

   ```bash
   docker-compose up -d
   ```

5. **Initialize Database**

   ```bash
   pnpm prisma migrate dev
   ```

6. **Start Development Server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5555](http://localhost:5555) in your browser.

## 📁 Project Structure

```
hireready/
├── app/                  # Next.js App Router pages & API
├── components/           # React UI components (HeroUI)
├── lib/
│   ├── gemini/           # Gemini Live API logic
│   ├── stores/           # Zustand state management
│   └── prisma/           # Database connection
├── messages/             # i18n translation files
├── prisma/               # Database Schema
├── public/               # Static assets
└── zeabur.yaml           # Zeabur deployment config
```

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
