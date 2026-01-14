'use client';

import { useTranslations } from 'next-intl';
import { Button, Link } from '@heroui/react';
import { motion } from 'framer-motion';
import { ArrowRight, VideoOff, MicOff, PhoneOff, Subtitles } from 'lucide-react';
import Image from 'next/image';

export const VideoHero = () => {
  const t = useTranslations('marketing.hero');
  const tInterface = useTranslations('marketing.interface');

  return (
    <section className="relative flex min-h-[90vh] flex-col items-center overflow-hidden px-4 pt-20 md:px-8">
      {/* Background Decor - Ambient Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-full w-full max-w-7xl -translate-x-1/2 opacity-40">
        <div className="bg-terracotta/20 absolute top-[10%] left-[20%] h-96 w-96 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] h-80 w-80 rounded-full bg-blue-300/20 blur-[100px]" />
      </div>

      <div className="z-10 flex w-full max-w-6xl flex-col items-center">
        {/* Header Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-12 text-center"
        >
          <h1 className="text-charcoal font-serif text-5xl leading-[1.1] font-medium tracking-tight sm:text-7xl md:text-8xl">
            {t('titlePart1')} <br />
            <span className="text-terracotta italic">{t('titlePart2')}</span>
          </h1>

          <p className="text-charcoal/60 mx-auto mt-6 max-w-2xl text-xl leading-relaxed font-light">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              as={Link}
              href="/interview/setup"
              className="group bg-terracotta text-warm-paper shadow-terracotta/25 hover:shadow-terracotta/40 h-auto rounded-2xl px-8 py-4 text-lg font-medium shadow-lg transition-all hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2">
                {t('cta')} <ArrowRight className="h-5 w-5" />
              </span>
            </Button>
          </div>
        </motion.div>

        {/* Video Interface Simulation - Matching Actual Product UI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          className="relative mt-8 aspect-video w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-gray-900 shadow-2xl"
          style={{ perspective: '1000px' }}
        >
          {/* The "Video Feed" - AI Interviewer Image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-900">
            <Image
              src="/images/ai-interviewer.png"
              alt="AI Interviewer"
              fill
              className="object-cover opacity-90"
              priority
            />
            {/* Subtle Overlay Gradient to make text readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
          </div>

          {/* UI Overlay: Top Bar (Visible) */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-start justify-between p-6">
            <div className="flex gap-2">
              {/* LIVE Indicator - Top Left */}
              <div className="flex items-center gap-2 rounded-full border border-white/5 bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-medium text-white">LIVE</span>
              </div>
            </div>

            {/* Analysis Badge REMOVED */}
          </div>

          {/* "You" Label / Audio Indicator - Bottom Left - MATCHING VideoPreview.tsx */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-30">
            <div className="flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white">{tInterface('you')}</span>
              {/* Audio Bars - simple CSS animation mimicking AudioIndicator */}
              <div className="flex h-4 items-end gap-0.5">
                <motion.div
                  animate={{ height: [4, 12, 4] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="w-1 rounded-full bg-green-400"
                />
                <motion.div
                  animate={{ height: [4, 8, 4] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                  className="w-1 rounded-full bg-green-400"
                />
                <motion.div
                  animate={{ height: [4, 10, 4] }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                  className="w-1 rounded-full bg-green-400"
                />
                <motion.div
                  animate={{ height: [4, 8, 4] }}
                  transition={{ repeat: Infinity, duration: 0.35 }}
                  className="w-1 rounded-full bg-green-400"
                />
                <motion.div
                  animate={{ height: [4, 6, 4] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="w-1 rounded-full bg-green-400"
                />
              </div>
            </div>
          </div>

          {/* Bottom Controls Bar - EXACT MATCH to ControlBar.tsx design */}
          <div className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2">
            <div className="border-warm-gray/20 flex items-center gap-6 rounded-2xl border bg-white/90 px-8 py-4 shadow-sm backdrop-blur-md">
              {/* Mic */}
              <button
                type="button"
                className="border-warm-gray/30 text-charcoal/50 hover:bg-charcoal/5 hover:border-charcoal/40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border transition-all"
                aria-label="Toggle microphone"
              >
                <MicOff className="h-5 w-5" />
              </button>

              {/* Camera */}
              <button
                type="button"
                className="border-warm-gray/30 text-charcoal/50 hover:bg-charcoal/5 hover:border-charcoal/40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border transition-all"
                aria-label="Toggle camera"
              >
                <VideoOff className="h-5 w-5" />
              </button>

              {/* Caption */}
              <button
                type="button"
                className="border-warm-gray/30 text-charcoal/50 hover:bg-charcoal/5 hover:border-charcoal/40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border transition-all"
                aria-label="Toggle subtitles"
              >
                <Subtitles className="h-5 w-5" />
              </button>

              <div className="bg-warm-gray/20 h-6 w-px" />

              {/* End Call */}
              <button
                type="button"
                className="bg-terracotta/10 text-terracotta hover:bg-terracotta/20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl transition-all"
                aria-label="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
