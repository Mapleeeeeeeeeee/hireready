'use client';

import { VideoHero } from '@/components/marketing/VideoHero';
import { TrustTicker } from '@/components/marketing/TrustTicker';
import { AnalysisGrid } from '@/components/marketing/AnalysisGrid';
import { FooterCTA } from '@/components/marketing/FooterCTA';

export default function HomePage() {
  return (
    <main className="bg-warm-paper selection:bg-terracotta/20 min-h-screen overflow-x-hidden">
      <VideoHero />
      <TrustTicker />
      <AnalysisGrid />
      <FooterCTA />
    </main>
  );
}
