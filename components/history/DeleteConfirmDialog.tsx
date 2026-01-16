'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Calendar } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Whether delete operation is in progress */
  isDeleting: boolean;
  /** Interview info to display */
  interviewInfo?: {
    title?: string;
    date?: string;
  };
}

// ============================================================
// Component
// ============================================================

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  interviewInfo,
}: DeleteConfirmDialogProps) {
  const t = useTranslations('history');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      placement="center"
      hideCloseButton
      classNames={{
        base: 'bg-warm-paper shadow-lg rounded-xl max-w-[360px] mx-4 relative z-[99999]',
        header: 'border-b-0 pb-2 pt-6 px-6',
        body: 'py-2 px-6',
        footer: 'border-t-0 pt-4 pb-6 px-6',
        backdrop: 'bg-charcoal/40 backdrop-blur-sm z-[99998]',
        wrapper: 'z-[99999]',
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-charcoal font-serif text-xl font-semibold">
                {t('deleteConfirm.title')}
              </h2>
            </ModalHeader>

            <ModalBody>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                {t('deleteConfirm.message')}
              </p>

              {interviewInfo && (
                <div className="bg-warm-gray/5 border-warm-gray/10 mt-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-charcoal truncate text-sm font-semibold">
                      {interviewInfo.title || t('untitledInterview')}
                    </p>
                    {interviewInfo.date && (
                      <div className="text-charcoal/40 mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>{interviewInfo.date}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2">
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isDeleting}
                className="text-charcoal/60 hover:text-charcoal font-medium"
              >
                {t('deleteConfirm.cancel')}
              </Button>
              <Button
                onPress={onConfirm}
                isLoading={isDeleting}
                className="border-2 border-red-100 bg-white font-medium text-red-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50"
              >
                {isDeleting ? t('deleteConfirm.deleting') : t('deleteConfirm.confirm')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
