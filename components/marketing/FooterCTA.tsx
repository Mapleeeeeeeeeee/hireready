'use client';

import { Button, Link } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const FooterCTA = () => {
  const t = useTranslations('marketing.footer');

  return (
    <footer className="border-charcoal/5 border-t bg-white/40 py-24">
      <div className="container mx-auto px-4 text-center md:px-8">
        <h2 className="text-charcoal mb-6 font-serif text-4xl font-medium md:text-5xl">
          {t('title')}
        </h2>
        <p className="text-charcoal/60 mx-auto mb-10 max-w-xl text-center text-xl font-light">
          {t('subtitle')}
        </p>
        <Button
          as={Link}
          href="/interview/setup"
          className="bg-terracotta hover:bg-terracotta/90 inline-flex h-auto items-center gap-2 rounded-xl px-10 py-4 text-lg font-medium text-white shadow-xl transition-all active:scale-[0.98]"
        >
          {t('cta')}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </footer>
  );
};
