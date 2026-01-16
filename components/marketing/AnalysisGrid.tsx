'use client';

import { motion } from 'framer-motion';
import { Sparkles, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const AnalysisCard = ({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
}) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`relative overflow-hidden rounded-3xl border border-white/50 bg-white/60 p-8 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-lg ${className}`}
  >
    <div className="relative z-10 flex h-full flex-col">
      <div className="bg-terracotta/10 text-terracotta mb-6 flex h-12 w-12 items-center justify-center rounded-xl">
        {icon}
      </div>
      <h3 className="text-charcoal font-serif text-2xl font-medium">{title}</h3>
      <p className="text-charcoal/60 mt-2 text-lg leading-relaxed">{description}</p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  </motion.div>
);

export const AnalysisGrid = () => {
  const t = useTranslations('marketing.analysis');

  return (
    <section className="container mx-auto px-4 py-24 md:px-8">
      <div className="mx-auto mb-16 max-w-3xl text-center">
        <h2 className="text-charcoal font-serif text-4xl font-medium md:text-5xl">
          {t('titlePart1')} <br />
          <span className="text-terracotta">{t('titlePart2')}</span>
        </h2>
        <p className="text-charcoal/60 mt-6 text-xl font-light">{t('subtitle')}</p>
      </div>

      {/* Grid: Centered 2 columns */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Card 1: AI Feedback */}
        <AnalysisCard
          title={t('cards.tone.title')}
          description={t('cards.tone.description')}
          icon={<Sparkles className="h-6 w-6" />}
        >
          <div className="bg-warm-paper/50 border-charcoal/5 flex h-32 items-center justify-center gap-6 overflow-hidden rounded-xl border p-4">
            {/* Score circle */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e0d5c9" strokeWidth="4" />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#C17F5E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="176"
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 35 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <span className="text-terracotta absolute text-lg font-bold">80</span>
            </div>
            {/* Strengths/Improvements */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-terracotta h-4 w-4" />
                <div className="bg-terracotta/20 h-2 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-terracotta h-4 w-4" />
                <div className="bg-terracotta/20 h-2 w-12 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-charcoal/40 h-4 w-4" />
                <div className="bg-charcoal/10 h-2 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </AnalysisCard>

        {/* Card 2: Model Answer */}
        <AnalysisCard
          title={t('cards.context.title')}
          description={t('cards.context.description')}
          icon={<FileText className="h-6 w-6" />}
        >
          <div className="bg-warm-paper/50 border-charcoal/5 relative h-32 overflow-hidden rounded-xl border p-4">
            <div className="space-y-2">
              <motion.div
                className="bg-terracotta/30 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <motion.div
                className="bg-terracotta/30 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              />
              <motion.div
                className="bg-terracotta/30 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.4 }}
              />
              <motion.div
                className="bg-terracotta/30 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '50%' }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.6 }}
              />
            </div>
            <motion.div
              className="text-terracotta absolute right-2 bottom-2 flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Sparkles className="h-3 w-3" />
              AI Generated
            </motion.div>
          </div>
        </AnalysisCard>
      </div>
    </section>
  );
};
