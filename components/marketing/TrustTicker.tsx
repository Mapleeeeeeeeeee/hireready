'use client';

import { useTranslations } from 'next-intl';

export const TrustTicker = () => {
  const t = useTranslations('marketing.ticker');

  const roles = [
    'roles.0',
    'roles.1',
    'roles.2',
    'roles.3',
    'roles.4',
    'roles.5',
    'roles.6',
    'roles.7',
  ].map((key) => t(key));

  return (
    <section className="border-charcoal/5 bg-warm-paper/50 overflow-hidden border-y py-10">
      <div className="ticker-wrapper relative flex overflow-hidden">
        <div className="ticker-track flex shrink-0 items-center gap-12">
          {roles.map((role, index) => (
            <div key={`a-${index}`} className="flex shrink-0 items-center gap-8">
              <span className="text-charcoal/40 font-serif text-2xl font-medium tracking-tight whitespace-nowrap">
                {role}
              </span>
              <span className="text-terracotta/40 text-xl">•</span>
            </div>
          ))}
        </div>
        <div className="ticker-track flex shrink-0 items-center gap-12" aria-hidden="true">
          {roles.map((role, index) => (
            <div key={`b-${index}`} className="flex shrink-0 items-center gap-8">
              <span className="text-charcoal/40 font-serif text-2xl font-medium tracking-tight whitespace-nowrap">
                {role}
              </span>
              <span className="text-terracotta/40 text-xl">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
