'use client';

import { useCallback, useState } from 'react';
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import {
  ArrowRight,
  Languages,
  FileText,
  Sparkles,
  FileUser,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { JdInput } from '@/components/interview/JdInput';
import { JdPreview } from '@/components/interview/JdPreview';
import { ResumeUpload } from '@/components/resume/ResumeUpload';
import { ResumeCard } from '@/components/resume/ResumeCard';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { useInterviewStore } from '@/lib/stores/interview-store';
import { useResumeManager } from '@/lib/hooks/use-resume-manager';
import { useSession } from '@/lib/auth/auth-client';
import type { JobDescription } from '@/lib/jd/types';

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
  const tNav = useTranslations('nav');
  const locale = useLocale();

  // Auth state
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Guest warning modal state
  const [isGuestWarningOpen, setIsGuestWarningOpen] = useState(false);

  // Store state and actions
  const language = useInterviewStore((state) => state.language);
  const setLanguage = useInterviewStore((state) => state.setLanguage);
  const jobDescription = useInterviewStore((state) => state.jobDescription);
  const setJobDescription = useInterviewStore((state) => state.setJobDescription);
  const setResumeContent = useInterviewStore((state) => state.setResumeContent);

  // Use the resume manager hook with content sync
  const {
    resume,
    isLoadingResume,
    isDeletingResume,
    isPreviewOpen,
    isReplacing,
    handleResumeUploadSuccess,
    handleResumePreview,
    handleResumeReplace,
    handleResumeDelete,
    handleCancelReplace,
    handleClosePreview,
  } = useResumeManager({
    onContentChange: setResumeContent,
  });

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

  // Proceed to interview (called directly or after confirming guest warning)
  const proceedToInterview = useCallback(() => {
    // Only pass resumeTaskId if the resume parsing is still in progress
    // (taskId exists but content has not been parsed yet).
    // If content already exists, parsing is complete and we don't need to wait.
    const isParsing = resume?.taskId && !resume?.content;
    const url = isParsing
      ? `/${locale}/interview?resumeTaskId=${resume.taskId}`
      : `/${locale}/interview`;
    router.push(url);
  }, [router, locale, resume]);

  // Handle start interview
  const handleStartInterview = useCallback(() => {
    // If not authenticated, show warning modal
    if (!isAuthenticated) {
      setIsGuestWarningOpen(true);
      return;
    }
    proceedToInterview();
  }, [isAuthenticated, proceedToInterview]);

  // Handle guest warning confirm
  const handleGuestContinue = useCallback(() => {
    setIsGuestWarningOpen(false);
    proceedToInterview();
  }, [proceedToInterview]);

  // Handle guest warning login
  const handleGuestLogin = useCallback(() => {
    setIsGuestWarningOpen(false);
    router.push(`/${locale}/login`);
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
                ) : !isAuthenticated ? (
                  // Unauthenticated: Show login prompt
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-charcoal/30 mb-4">
                      <Upload className="h-10 w-10" />
                    </div>
                    <p className="text-charcoal/60 mb-4 text-sm">{t('resumeLoginRequired')}</p>
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => router.push(`/${locale}/login`)}
                      className="border-terracotta text-terracotta hover:bg-terracotta/10"
                    >
                      {tNav('login')}
                    </Button>
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
                      onClose={handleClosePreview}
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

      {/* Guest Warning Modal */}
      <Modal
        isOpen={isGuestWarningOpen}
        onClose={() => setIsGuestWarningOpen(false)}
        placement="center"
        size="sm"
        classNames={{
          base: 'bg-warm-paper',
          header: 'border-b-0 pb-0 pt-6',
          body: 'py-4 px-6',
          footer: 'border-t-0 pt-0 pb-6 px-6',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col items-center gap-2 text-center">
            <div className="bg-terracotta/10 mb-2 flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle className="text-terracotta h-5 w-5" />
            </div>
            <h3 className="text-charcoal text-lg font-semibold">{t('guestWarning.title')}</h3>
          </ModalHeader>
          <ModalBody>
            <p className="text-charcoal/70 text-center text-sm">{t('guestWarning.message')}</p>
          </ModalBody>
          <ModalFooter className="flex-col gap-2">
            <Button
              size="md"
              onPress={handleGuestContinue}
              className="bg-terracotta hover:bg-terracotta/90 w-full text-white"
            >
              {t('guestWarning.continueAsGuest')}
            </Button>
            <Button
              size="md"
              variant="bordered"
              onPress={handleGuestLogin}
              className="border-terracotta text-terracotta hover:bg-terracotta/10 w-full"
            >
              {t('guestWarning.loginFirst')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
