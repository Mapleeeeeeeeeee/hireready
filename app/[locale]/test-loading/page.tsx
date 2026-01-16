'use client';

import { useState, useEffect } from 'react';
import { AnalysisLoading } from '@/components/history/AnalysisLoading';
import { SaveConfirmDialog } from '@/components/interview/SaveConfirmDialog';
import { Button } from '@heroui/react';
import { RefreshCw, Save } from 'lucide-react';

export default function TestLoadingPage() {
  const [progress, setProgress] = useState(0);
  const [key, setKey] = useState(0); // To force re-render for restart
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 0.5; // Slow enough to see the animation
      });
    }, 50);

    return () => clearInterval(interval);
  }, [key]);

  const handleRestart = () => {
    setProgress(0);
    setKey((prev) => prev + 1);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate async save
    setTimeout(() => {
      setIsSaving(false);
      setIsModalOpen(false);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-charcoal mb-8 text-center text-2xl font-bold">
          Loading Effect Preview
        </h1>

        <AnalysisLoading progress={progress} />

        <div className="mt-12 flex w-full justify-center gap-4">
          <Button
            onPress={handleRestart}
            color="primary"
            variant="flat"
            startContent={<RefreshCw className="h-4 w-4" />}
          >
            Restart Animation
          </Button>
          <Button
            onPress={() => setIsModalOpen(true)}
            color="secondary"
            startContent={<Save className="h-4 w-4" />}
          >
            Open Save Modal
          </Button>
        </div>
      </div>

      <SaveConfirmDialog
        isOpen={isModalOpen}
        onSave={handleSave}
        onDiscard={() => setIsModalOpen(false)}
        duration={125}
        transcriptCount={8}
        isSaving={isSaving}
        jobDescriptionUrl="https://www.104.com.tw/job/12345"
      />
    </div>
  );
}
