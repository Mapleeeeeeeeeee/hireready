'use client';

import { useTranslations } from 'next-intl';
import { Button, Link } from '@heroui/react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="bg-warm-paper text-charcoal selection:bg-terracotta/20 relative flex min-h-screen flex-col items-center justify-center p-8">
      <div className="z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-16"
        >
          {/* Badge */}
          <div className="bg-terracotta/10 border-terracotta/20 mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <span className="text-terracotta text-xs font-bold tracking-widest uppercase">
              AI-Powered Practice
            </span>
          </div>

          {/* Brand Display */}
          <h1 className="text-charcoal mb-4 font-serif text-7xl font-semibold tracking-tight sm:text-9xl">
            HireReady
          </h1>

          {/* Functional Title */}
          <h2 className="text-charcoal/60 mb-8 font-sans text-2xl font-medium sm:text-3xl">
            {t('home.title')}
          </h2>

          <p className="text-charcoal/70 mx-auto mb-10 max-w-xl text-xl leading-relaxed font-light">
            {t('home.subtitle')}
          </p>

          <Button
            as={Link}
            href="/interview"
            size="lg"
            className="group bg-terracotta shadow-terracotta/20 hover:shadow-terracotta/30 relative rounded-xl px-10 py-7 text-lg font-medium text-white shadow-md transition-all hover:shadow-lg"
          >
            <span className="flex items-center gap-2">
              {t('home.startButton')}{' '}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
