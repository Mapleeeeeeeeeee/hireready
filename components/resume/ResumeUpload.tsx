'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Spinner } from '@heroui/react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { RESUME_CONSTRAINTS, isAllowedResumeType } from '@/lib/resume/types';
import type { ResumeData } from '@/lib/resume/types';
import { apiPostFormData } from '@/lib/utils/api-client';
import { toAppError } from '@/lib/utils/errors';

// ============================================================
// Types
// ============================================================

export interface ResumeUploadProps {
  /** Callback when upload succeeds */
  onUploadSuccess: (data: ResumeData) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
}

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-8 w-8" />;
  }
  return <ImageIcon className="h-8 w-8" />;
}

// ============================================================
// Component
// ============================================================

export function ResumeUpload({ onUploadSuccess, onUploadError }: ResumeUploadProps) {
  const t = useTranslations('resume');
  const tErrors = useTranslations('errors');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!isAllowedResumeType(file.type)) {
        return t('errors.invalidType');
      }

      // Check file size
      if (file.size > RESUME_CONSTRAINTS.maxFileSize) {
        return t('errors.fileTooLarge', {
          maxSize: formatFileSize(RESUME_CONSTRAINTS.maxFileSize),
        });
      }

      return null;
    },
    [t]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);
      setUploadSuccess(false);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    },
    [validateFile]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle click to select file
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      // Reset input value to allow selecting same file again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setError(null);
    setIsLoading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Upload file using apiPostFormData for consistent error handling
      const data = await apiPostFormData<ResumeData>('/api/resume/upload', formData);

      setUploadSuccess(true);
      setSelectedFile(null);
      onUploadSuccess(data);
    } catch (err) {
      // Convert to AppError for consistent error code access
      const appError = toAppError(err);
      // Use i18n error message based on error code, fallback to generic message
      const errorMessage = tErrors(appError.code) || t('errors.uploadFailed');
      setError(errorMessage);
      onUploadError?.(appError);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, onUploadSuccess, onUploadError, t, tErrors]);

  // Clear selected file
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setUploadSuccess(false);
  }, []);

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={RESUME_CONSTRAINTS.allowedExtensions.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={isLoading}
      />

      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all ${
          isDragging
            ? 'border-terracotta bg-terracotta/5'
            : selectedFile
              ? 'border-terracotta/50 bg-terracotta/5'
              : 'border-warm-gray/30 hover:border-terracotta/30 hover:bg-warm-gray/5 bg-white/50'
        } ${isLoading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleClick : undefined}
      >
        <div className="flex flex-col items-center justify-center px-6 py-10">
          {isLoading ? (
            <>
              <Spinner size="lg" color="primary" className="text-terracotta" />
              <p className="text-charcoal/60 mt-4 text-sm">{t('uploading')}</p>
            </>
          ) : selectedFile ? (
            <>
              <div className="text-terracotta">{getFileIcon(selectedFile.type)}</div>
              <p className="text-charcoal mt-3 text-center font-medium">{selectedFile.name}</p>
              <p className="text-charcoal/50 mt-1 text-sm">{formatFileSize(selectedFile.size)}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleClear}
                  className="text-charcoal/60 hover:text-charcoal"
                >
                  {t('clear')}
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleUpload}
                  className="bg-terracotta hover:bg-terracotta/90 text-white"
                >
                  {t('upload')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-charcoal/30">
                <Upload className="h-10 w-10" />
              </div>
              <p className="text-charcoal mt-4 font-medium">{t('dropzone.title')}</p>
              <p className="text-charcoal/50 mt-1 text-center text-sm">{t('dropzone.subtitle')}</p>
              <p className="text-charcoal/40 mt-3 text-xs">
                {t('dropzone.formats', {
                  formats: 'PDF, JPG, PNG',
                  maxSize: formatFileSize(RESUME_CONSTRAINTS.maxFileSize),
                })}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Success message */}
      {uploadSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{t('uploadSuccess')}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
