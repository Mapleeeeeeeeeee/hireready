'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea, Tabs, Tab, Spinner } from '@heroui/react';
import { Link2, FileText, AlertCircle, Search } from 'lucide-react';
import { apiPost } from '@/lib/utils/api-client';
import type { JobDescription } from '@/lib/jd/types';

// ============================================================
// Types
// ============================================================

interface JdInputProps {
  /** Callback when JD is successfully parsed */
  onParsed: (jd: JobDescription) => void;
  /** External loading state */
  isLoading?: boolean;
}

type InputMode = 'url' | 'text';

// ============================================================
// Component
// ============================================================

export function JdInput({ onParsed, isLoading: externalLoading = false }: JdInputProps) {
  const t = useTranslations('interview.setup.jd');

  // State
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = externalLoading || isInternalLoading;

  // URL validation - validates both URL format and supported domains
  const isValidUrl = useCallback((input: string): boolean => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return false;

    // First, validate it's a proper URL
    try {
      const parsedUrl = new URL(trimmedInput);
      // Only allow HTTPS for security
      if (parsedUrl.protocol !== 'https:') return false;

      // Check against supported domains
      const supportedDomains = ['104.com.tw', '1111.com.tw'];
      return supportedDomains.some(
        (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }, []);

  // Handle URL parse
  const handleParseUrl = useCallback(async () => {
    if (!url.trim()) {
      setError(t('errors.urlRequired'));
      return;
    }

    if (!isValidUrl(url)) {
      setError(t('errors.unsupportedUrl'));
      return;
    }

    setError(null);
    setIsInternalLoading(true);

    try {
      const result = await apiPost<{ jobDescription: JobDescription }>('/api/jd/parse', {
        type: 'url',
        content: url.trim(),
      });
      onParsed(result.jobDescription);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.parseFailed');
      setError(message);
    } finally {
      setIsInternalLoading(false);
    }
  }, [url, isValidUrl, onParsed, t]);

  // Handle manual input submit
  const handleManualSubmit = useCallback(() => {
    if (!jobTitle.trim()) {
      setError(t('errors.titleRequired'));
      return;
    }

    if (!description.trim()) {
      setError(t('errors.descriptionRequired'));
      return;
    }

    setError(null);

    const manualJd: JobDescription = {
      source: 'manual',
      title: jobTitle.trim(),
      company: company.trim() || t('unknownCompany'),
      description: description.trim(),
      fetchedAt: new Date(),
    };

    onParsed(manualJd);
  }, [jobTitle, company, description, onParsed, t]);

  // Handle mode change
  const handleModeChange = useCallback((key: React.Key) => {
    setMode(key as InputMode);
    setError(null);
  }, []);

  return (
    <div className="w-full">
      <Tabs
        selectedKey={mode}
        onSelectionChange={handleModeChange}
        aria-label={t('inputMode')}
        variant="underlined"
        classNames={{
          tabList: 'gap-8 border-b border-warm-gray/20 w-full',
          cursor: 'bg-terracotta h-[2px]',
          tab: 'text-charcoal/60 data-[selected=true]:text-charcoal font-medium px-2 pb-4 whitespace-nowrap transition-colors data-[selected=true]:font-semibold',
          tabContent: 'group-data-[selected=true]:text-charcoal',
        }}
      >
        {/* URL Mode */}
        <Tab
          key="url"
          title={
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span>{t('urlTab')}</span>
            </div>
          }
        >
          <div className="mt-6 space-y-6">
            <p className="text-charcoal/60 text-sm leading-relaxed">{t('urlDescription')}</p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Input
                type="url"
                placeholder={t('urlPlaceholder')}
                value={url}
                onValueChange={setUrl}
                isDisabled={isLoading}
                size="lg"
                classNames={{
                  input: 'text-charcoal text-base',
                  inputWrapper:
                    'h-12 border-warm-gray/30 bg-white/80 shadow-sm hover:border-terracotta/50 focus-within:border-terracotta transition-colors',
                }}
                startContent={
                  <div className="pointer-events-none mr-3 flex items-center justify-center">
                    <Link2 className="text-charcoal/40 h-5 w-5" />
                  </div>
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleParseUrl();
                  }
                }}
                className="flex-1"
              />
              <Button
                size="lg"
                color="primary"
                onPress={handleParseUrl}
                isDisabled={!url.trim() || isLoading}
                className="bg-terracotta hover:bg-terracotta/90 h-12 min-w-[120px] text-white shadow-md transition-transform active:scale-[0.98]"
                startContent={
                  isLoading ? <Spinner size="sm" color="current" /> : <Search className="h-5 w-5" />
                }
              >
                {isLoading ? t('parsing') : t('parse')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-charcoal/50 font-medium">{t('supportedSites')}:</span>
              <div className="flex gap-2">
                <span className="text-charcoal/70 rounded-full bg-blue-50 px-3 py-1 font-medium transition-colors hover:bg-blue-100">
                  104.com.tw
                </span>
                <span className="text-charcoal/70 rounded-full bg-green-50 px-3 py-1 font-medium transition-colors hover:bg-green-100">
                  1111.com.tw
                </span>
              </div>
            </div>
          </div>
        </Tab>

        {/* Text Mode */}
        <Tab
          key="text"
          title={
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{t('textTab')}</span>
            </div>
          }
        >
          <div className="mt-6 space-y-6">
            <p className="text-charcoal/60 text-sm">{t('textDescription')}</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
              {/* Job Title */}
              <div className="flex flex-col gap-2">
                <label className="text-charcoal/80 text-sm font-medium">
                  {t('jobTitle')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('jobTitlePlaceholder')}
                  value={jobTitle}
                  onValueChange={setJobTitle}
                  isDisabled={isLoading}
                  classNames={{
                    input: 'text-charcoal',
                    inputWrapper: 'border-warm-gray/30 bg-white/80 h-11',
                  }}
                />
              </div>
              {/* Company */}
              <div className="flex flex-col gap-2">
                <label className="text-charcoal/80 text-sm font-medium">{t('company')}</label>
                <Input
                  placeholder={t('companyPlaceholder')}
                  value={company}
                  onValueChange={setCompany}
                  isDisabled={isLoading}
                  classNames={{
                    input: 'text-charcoal',
                    inputWrapper: 'border-warm-gray/30 bg-white/80 h-11',
                  }}
                />
              </div>
            </div>
            {/* Job Description */}
            <div className="flex flex-col gap-2">
              <label className="text-charcoal/80 text-sm font-medium">
                {t('description')} <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={t('descriptionPlaceholder')}
                value={description}
                onValueChange={setDescription}
                isDisabled={isLoading}
                minRows={4}
                maxRows={8}
                classNames={{
                  input: 'text-charcoal',
                  inputWrapper: 'border-warm-gray/30 bg-white/80 h-auto py-3',
                }}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                color="primary"
                onPress={handleManualSubmit}
                isDisabled={!jobTitle.trim() || !description.trim() || isLoading}
                className="bg-terracotta hover:bg-terracotta/90 text-white"
              >
                {t('confirm')}
              </Button>
            </div>
          </div>
        </Tab>
      </Tabs>

      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
