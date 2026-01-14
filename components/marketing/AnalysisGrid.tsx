'use client';

import { motion } from 'framer-motion';
import { Mic, Brain } from 'lucide-react';
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

// Pre-defined bar heights and durations to avoid Math.random() in render
const BAR_CONFIGS = [
  { height: 60, duration: 0.7 },
  { height: 85, duration: 0.55 },
  { height: 45, duration: 0.8 },
  { height: 90, duration: 0.6 },
  { height: 50, duration: 0.75 },
  { height: 75, duration: 0.65 },
  { height: 55, duration: 0.9 },
  { height: 80, duration: 0.5 },
  { height: 65, duration: 0.85 },
  { height: 70, duration: 0.58 },
  { height: 40, duration: 0.72 },
  { height: 95, duration: 0.62 },
];

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
        {/* Card 1: Tone & Pitch */}
        <AnalysisCard
          title={t('cards.tone.title')}
          description={t('cards.tone.description')}
          icon={<Mic className="h-6 w-6" />}
        >
          <div className="bg-warm-paper/50 border-charcoal/5 flex h-32 items-end justify-center gap-1 overflow-hidden rounded-xl border p-4">
            {BAR_CONFIGS.map((config, i) => (
              <motion.div
                key={i}
                className="bg-terracotta/60 w-2 rounded-t-sm"
                animate={{ height: ['20%', `${config.height}%`, '20%'] }}
                transition={{ duration: config.duration, repeat: Infinity }}
              />
            ))}
          </div>
        </AnalysisCard>

        {/* Card 2: Context */}
        <AnalysisCard
          title={t('cards.context.title')}
          description={t('cards.context.description')}
          icon={<Brain className="h-6 w-6" />}
        >
          <div className="bg-warm-paper/50 border-charcoal/5 relative h-32 overflow-hidden rounded-xl border p-4">
            <div className="space-y-2">
              <div className="bg-charcoal/10 h-2 w-3/4 rounded-full" />
              <div className="bg-charcoal/10 h-2 w-full rounded-full" />
              <div className="bg-charcoal/10 h-2 w-5/6 rounded-full" />
              <div className="bg-charcoal/10 h-2 w-1/2 rounded-full" />
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ translateX: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            <div className="text-terracotta absolute right-2 bottom-2 rounded bg-white px-2 py-1 text-xs font-bold shadow-sm">
              {t('cards.context.matchLabel', { percent: '92' })}
            </div>
          </div>
        </AnalysisCard>
      </div>
    </section>
  );
};
