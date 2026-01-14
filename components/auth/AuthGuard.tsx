'use client';

import { useSession } from '@/lib/auth/auth-client';
import { useGoogleLogin } from '@/lib/auth/hooks';
import { useTranslations } from 'next-intl';
import { Button, Card, CardBody, CardHeader, Spinner } from '@heroui/react';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const t = useTranslations();
  const { data: session, isPending } = useSession();
  const handleLogin = useGoogleLogin();

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" color="primary" label={t('common.loading')} />
      </div>
    );
  }

  if (!session?.user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="bg-warm-paper border-warm-gray/10 w-full max-w-md border shadow-sm">
          <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-0">
            <h2 className="text-charcoal font-serif text-2xl font-semibold">
              {t('auth.loginRequired')}
            </h2>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-6 px-8 py-8">
            <p className="text-charcoal/60 text-center">{t('auth.loginToAccess')}</p>
            <Button
              size="lg"
              color="primary"
              variant="solid"
              onPress={handleLogin}
              className="bg-terracotta hover:bg-terracotta/90 w-full font-medium text-white"
            >
              {t('auth.loginWithGoogle')}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
