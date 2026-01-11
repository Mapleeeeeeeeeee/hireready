'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, CardBody, Link } from '@heroui/react';

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('home.title')}</h1>
        <p className="mb-8 text-xl text-gray-600 dark:text-gray-400">{t('home.subtitle')}</p>

        <Button as={Link} href="/interview" color="primary" size="lg" className="mb-12">
          {t('home.startButton')}
        </Button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardBody className="p-6 text-center">
              <div className="mb-4 text-4xl">🎙️</div>
              <h3 className="mb-2 text-lg font-semibold">{t('home.features.voice')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('home.features.voiceDesc')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6 text-center">
              <div className="mb-4 text-4xl">📹</div>
              <h3 className="mb-2 text-lg font-semibold">{t('home.features.video')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('home.features.videoDesc')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6 text-center">
              <div className="mb-4 text-4xl">💡</div>
              <h3 className="mb-2 text-lg font-semibold">{t('home.features.feedback')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('home.features.feedbackDesc')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
