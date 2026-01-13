'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardBody, Button, RadioGroup, Radio } from '@heroui/react';
import { ArrowRight, Languages, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { JdInput } from '@/components/interview/JdInput';
import { JdPreview } from '@/components/interview/JdPreview';
import { useInterviewStore } from '@/lib/stores/interview-store';
import type { JobDescription } from '@/lib/jd/types';

// ============================================================
// Component
// ============================================================

export default function InterviewSetupPage() {
  const router = useRouter();
  const t = useTranslations('interview.setup');
  const locale = useLocale();

  // Store state and actions
  const language = useInterviewStore((state) => state.language);
  const setLanguage = useInterviewStore((state) => state.setLanguage);
  const jobDescription = useInterviewStore((state) => state.jobDescription);
  const setJobDescription = useInterviewStore((state) => state.setJobDescription);

  // Handle JD parsed
  const handleJdParsed = useCallback(
    (jd: JobDescription) => {
      setJobDescription(jd);
    },
    [setJobDescription]
  );

  // Handle JD clear
  const handleJdClear = useCallback(() => {
    setJobDescription(null);
  }, [setJobDescription]);

  // Handle language change
  const handleLanguageChange = useCallback(
    (value: string) => {
      setLanguage(value as 'en' | 'zh-TW');
    },
    [setLanguage]
  );

  // Handle start interview
  const handleStartInterview = useCallback(() => {
    router.push(`/${locale}/interview`);
  }, [router, locale]);

  return (
    <div className="bg-warm-paper text-charcoal min-h-screen">
      {/* Background Decor */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-soft-clay/30 animate-pulse-soft h-[400px] w-[400px] rounded-full blur-[100px]" />
        </div>
        <div className="absolute top-2/3 right-1/4 translate-x-1/2 translate-y-1/2 transform">
          <div className="bg-terracotta/10 animate-pulse-soft h-[300px] w-[300px] rounded-full blur-[80px]" />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-charcoal mb-2 text-3xl font-bold">{t('title')}</h1>
          <p className="text-charcoal/60">{t('subtitle')}</p>
        </motion.div>

        <div className="space-y-6">
          {/* Language Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-warm-gray/20 border bg-white/60 shadow-sm backdrop-blur-sm">
              <CardBody className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Languages className="text-terracotta h-5 w-5" />
                  <h2 className="text-charcoal text-lg font-semibold">{t('languageTitle')}</h2>
                </div>
                <p className="text-charcoal/60 mb-4 text-sm">{t('languageDescription')}</p>
                <RadioGroup
                  orientation="horizontal"
                  value={language}
                  onValueChange={handleLanguageChange}
                  classNames={{
                    wrapper: 'gap-4',
                  }}
                >
                  <Radio
                    value="zh-TW"
                    classNames={{
                      base: 'border-warm-gray/30 data-[selected=true]:border-terracotta rounded-lg border-2 px-4 py-3 transition-all',
                      label: 'text-charcoal',
                    }}
                  >
                    {t('languages.zhTW')}
                  </Radio>
                  <Radio
                    value="en"
                    classNames={{
                      base: 'border-warm-gray/30 data-[selected=true]:border-terracotta rounded-lg border-2 px-4 py-3 transition-all',
                      label: 'text-charcoal',
                    }}
                  >
                    {t('languages.en')}
                  </Radio>
                </RadioGroup>
              </CardBody>
            </Card>
          </motion.div>

          {/* JD Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-warm-gray/20 border bg-white/60 shadow-sm backdrop-blur-sm">
              <CardBody className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="text-terracotta h-5 w-5" />
                  <h2 className="text-charcoal text-lg font-semibold">{t('jdTitle')}</h2>
                  <span className="bg-terracotta/10 text-terracotta rounded-full px-2 py-0.5 text-xs font-medium">
                    {t('optional')}
                  </span>
                </div>
                <p className="text-charcoal/60 mb-4 text-sm">{t('jdDescription')}</p>

                {jobDescription ? (
                  <JdPreview jobDescription={jobDescription} onClear={handleJdClear} />
                ) : (
                  <JdInput onParsed={handleJdParsed} />
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* Start Interview Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-4"
          >
            <Button
              size="lg"
              onPress={handleStartInterview}
              className="bg-terracotta hover:bg-terracotta/90 w-full text-white shadow-lg"
              endContent={<ArrowRight className="h-5 w-5" />}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {t('startButton')}
            </Button>
            <p className="text-charcoal/40 mt-3 text-center text-xs">{t('startHint')}</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
