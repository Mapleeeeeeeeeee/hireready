import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'interview' });

  return {
    title: t('title'),
  };
}

export default function InterviewPage() {
  return <InterviewRoom />;
}
