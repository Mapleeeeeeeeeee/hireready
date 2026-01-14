'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import { useGoogleLogin } from '@/lib/auth/hooks';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const handleLogin = useGoogleLogin();

  // Redirect if already logged in
  useEffect(() => {
    if (session && !isPending) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  // Show nothing while checking session
  if (isPending) {
    return (
      <main className="bg-warm-paper flex min-h-screen items-center justify-center">
        <div className="text-charcoal/50 animate-pulse">{t('common.loading')}</div>
      </main>
    );
  }

  // Don't render login page if already logged in
  if (session) {
    return null;
  }

  return (
    <main className="bg-warm-paper text-charcoal selection:bg-terracotta/20 relative flex min-h-screen flex-col items-center justify-center p-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-terracotta/5 absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full blur-3xl" />
        <div className="bg-warm-gray/10 absolute -bottom-1/4 -left-1/4 h-[400px] w-[400px] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="border-warm-gray/10 rounded-2xl border bg-white/60 p-10 shadow-xl backdrop-blur-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-charcoal mb-2 font-serif text-4xl font-semibold tracking-tight">
              HireReady
            </h1>
            <p className="text-charcoal/60 text-sm">{t('home.title')}</p>
          </div>

          {/* Welcome message */}
          <div className="mb-8 text-center">
            <h2 className="text-charcoal mb-2 text-xl font-medium">{t('auth.welcomeBack')}</h2>
            <p className="text-charcoal/60 text-sm">{t('login.subtitle')}</p>
          </div>

          {/* Google Login Button */}
          <Button
            size="lg"
            className="bg-charcoal hover:bg-charcoal/90 w-full rounded-xl py-6 text-base font-medium text-white transition-all"
            onPress={handleLogin}
            startContent={
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
          >
            {t('auth.loginWithGoogle')}
          </Button>

          {/* Terms hint */}
          <p className="text-charcoal/40 mt-6 text-center text-xs">{t('login.termsHint')}</p>
        </div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <Link href="/" className="text-charcoal/50 hover:text-charcoal text-sm transition-colors">
            {t('login.backToHome')}
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
