'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Card,
  CardBody,
  Button,
  RadioGroup,
  useRadio,
  VisuallyHidden,
  RadioProps,
  Spinner,
} from '@heroui/react';
import { ArrowRight, Languages, FileText, Sparkles, FileUser } from 'lucide-react';
import { motion } from 'framer-motion';
import { JdInput } from '@/components/interview/JdInput';
import { JdPreview } from '@/components/interview/JdPreview';
import { ResumeUpload } from '@/components/resume/ResumeUpload';
import { ResumeCard } from '@/components/resume/ResumeCard';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { useInterviewStore } from '@/lib/stores/interview-store';
import type { JobDescription } from '@/lib/jd/types';
import type { ResumeData } from '@/lib/resume/types';
import type { ApiResponse } from '@/lib/utils/api-response';

// ============================================================
// Custom Components
// ============================================================

const CustomRadio = (props: RadioProps) => {
  const { Component, children, isSelected, getBaseProps, getInputProps, getLabelProps } =
    useRadio(props);

  return (
    <Component
      {...getBaseProps()}
      className={`group hover:bg-warm-gray/10 tap-highlight-transparent relative flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-4 transition-all ${isSelected ? 'border-terracotta bg-terracotta/5' : 'bg-warm-gray/5 border-transparent'} `}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>

      <div className="flex items-center gap-2">
        <span {...getLabelProps()} className="text-charcoal text-sm font-medium">
          {children}
        </span>
      </div>

      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'border-terracotta bg-terracotta' : 'border-warm-gray/30'} `}
      >
        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </Component>
  );
};

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
  const setResumeContent = useInterviewStore((state) => state.setResumeContent);

  // Resume state
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  // Fetch user's resume on mount
  useEffect(() => {
    async function fetchResume() {
      try {
        const response = await fetch('/api/resume', { credentials: 'include' });
        const json: ApiResponse<ResumeData | null> = await response.json();

        if (json.success && json.data) {
          setResume(json.data);
          // Also update store with resume content for interview
          setResumeContent(json.data.content);
        }
      } catch {
        // User might not have a resume, which is fine
      } finally {
        setIsLoadingResume(false);
      }
    }

    fetchResume();
  }, [setResumeContent]);

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

  // Handle resume upload success
  const handleResumeUploadSuccess = useCallback(
    (data: ResumeData) => {
      setResume(data);
      setResumeContent(data.content);
      setIsReplacing(false);
    },
    [setResumeContent]
  );

  // Handle resume preview
  const handleResumePreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  // Handle resume replace
  const handleResumeReplace = useCallback(() => {
    setIsReplacing(true);
  }, []);

  // Handle resume delete
  const handleResumeDelete = useCallback(async () => {
    setIsDeletingResume(true);
    try {
      const response = await fetch('/api/resume', {
        method: 'DELETE',
        credentials: 'include',
      });
      const json: ApiResponse<{ deleted: boolean }> = await response.json();

      if (json.success) {
        setResume(null);
        setResumeContent(null);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsDeletingResume(false);
    }
  }, [setResumeContent]);

  // Handle cancel replace
  const handleCancelReplace = useCallback(() => {
    setIsReplacing(false);
  }, []);

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
                    wrapper: 'grid grid-cols-2 gap-4',
                  }}
                >
                  <CustomRadio value="zh-TW">{t('languages.zhTW')}</CustomRadio>
                  <CustomRadio value="en">{t('languages.en')}</CustomRadio>
                </RadioGroup>
              </CardBody>
            </Card>
          </motion.div>

          {/* Resume Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-warm-gray/20 border bg-white/60 shadow-sm backdrop-blur-sm">
              <CardBody className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <FileUser className="text-terracotta h-5 w-5" />
                  <h2 className="text-charcoal text-lg font-semibold">{t('resumeTitle')}</h2>
                  <span className="bg-terracotta/10 text-terracotta rounded-full px-2 py-0.5 text-xs font-medium">
                    {t('optional')}
                  </span>
                </div>
                <p className="text-charcoal/60 mb-4 text-sm">{t('resumeDescription')}</p>

                {isLoadingResume ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="lg" color="primary" className="text-terracotta" />
                  </div>
                ) : resume && !isReplacing ? (
                  <>
                    <ResumeCard
                      resume={resume}
                      onPreview={handleResumePreview}
                      onReplace={handleResumeReplace}
                      onDelete={handleResumeDelete}
                      isDeleting={isDeletingResume}
                    />
                    <ResumePreview
                      url={resume.url}
                      fileName={resume.fileName}
                      isOpen={isPreviewOpen}
                      onClose={() => setIsPreviewOpen(false)}
                    />
                  </>
                ) : (
                  <div className="space-y-4">
                    <ResumeUpload onUploadSuccess={handleResumeUploadSuccess} />
                    {isReplacing && (
                      <Button
                        variant="light"
                        onPress={handleCancelReplace}
                        className="text-charcoal/60 w-full"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* JD Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <Button
              size="lg"
              onPress={handleStartInterview}
              className="bg-terracotta hover:bg-terracotta/90 w-full text-white shadow-lg"
              startContent={<Sparkles className="h-5 w-5" />}
              endContent={<ArrowRight className="h-5 w-5" />}
            >
              {t('startButton')}
            </Button>
            <p className="text-charcoal/40 mt-3 text-center text-xs">{t('startHint')}</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
