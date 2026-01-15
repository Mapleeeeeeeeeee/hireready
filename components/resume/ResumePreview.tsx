'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { X, FileText, ExternalLink } from 'lucide-react';
import { getFileTypeFromName } from '@/lib/resume/types';

// ============================================================
// Types
// ============================================================

export interface ResumePreviewProps {
  /** URL of the resume file (API endpoint path) */
  url: string;
  /** Original file name */
  fileName: string;
  /** Whether the preview modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export function ResumePreview({ url, fileName, isOpen, onClose }: ResumePreviewProps) {
  const t = useTranslations('resume');

  const fileType = useMemo(() => getFileTypeFromName(fileName), [fileName]);

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        wrapper: 'fixed inset-0 z-50 overflow-y-auto',
        base: 'bg-warm-paper shadow-xl rounded-xl mx-4 max-h-[90vh]',
        header: 'border-b border-warm-gray/10 px-6 py-4',
        body: 'p-0',
        closeButton: 'hidden',
        backdrop: 'bg-charcoal/50 backdrop-blur-sm',
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="text-terracotta flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-charcoal truncate font-serif text-lg font-semibold">
                  {fileName}
                </span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={handleOpenInNewTab}
                  className="text-charcoal/60 hover:text-charcoal"
                  aria-label={t('preview.openInNewTab')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onClose}
                  className="text-charcoal/60 hover:text-charcoal"
                  aria-label={t('preview.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="relative z-10 flex min-h-[60vh] items-center justify-center bg-gray-100">
                {fileType === 'pdf' ? (
                  <iframe
                    src={`${url}#toolbar=1&navpanes=0`}
                    className="relative z-10 h-[80vh] w-full border-0"
                    title={fileName}
                  />
                ) : (
                  <div className="relative z-10 flex h-[80vh] w-full items-center justify-center p-4">
                    {/* Using img tag for API-served images to avoid Next.js Image optimization issues */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={fileName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
