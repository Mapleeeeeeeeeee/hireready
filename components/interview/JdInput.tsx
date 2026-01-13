'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea, Tabs, Tab, Card, CardBody, Spinner } from '@heroui/react';
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
      const result = await apiPost<JobDescription>('/api/jd/parse', { url });
      onParsed(result);
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
    <Card className="border-warm-gray/20 w-full border bg-white/60 shadow-sm backdrop-blur-sm">
      <CardBody className="p-6">
        <Tabs
          selectedKey={mode}
          onSelectionChange={handleModeChange}
          aria-label={t('inputMode')}
          classNames={{
            tabList: 'bg-soft-clay/30 p-1',
            cursor: 'bg-white shadow-sm',
            tab: 'text-charcoal/70 data-[selected=true]:text-charcoal',
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
            <div className="mt-4 space-y-4">
              <p className="text-charcoal/60 text-sm">{t('urlDescription')}</p>
              <div className="flex gap-3">
                <Input
                  type="url"
                  placeholder={t('urlPlaceholder')}
                  value={url}
                  onValueChange={setUrl}
                  isDisabled={isLoading}
                  classNames={{
                    input: 'text-charcoal',
                    inputWrapper: 'border-warm-gray/30 bg-white/80',
                  }}
                  startContent={<Link2 className="text-charcoal/40 h-4 w-4" />}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleParseUrl();
                    }
                  }}
                />
                <Button
                  color="primary"
                  onPress={handleParseUrl}
                  isDisabled={!url.trim() || isLoading}
                  className="bg-terracotta hover:bg-terracotta/90 min-w-[100px] text-white"
                  startContent={
                    isLoading ? <Spinner size="sm" color="white" /> : <Search className="h-4 w-4" />
                  }
                >
                  {isLoading ? t('parsing') : t('parse')}
                </Button>
              </div>
              <div className="text-charcoal/50 flex flex-wrap gap-2 text-xs">
                <span>{t('supportedSites')}:</span>
                <span className="text-charcoal/70 rounded bg-blue-50 px-2 py-0.5">104.com.tw</span>
                <span className="text-charcoal/70 rounded bg-green-50 px-2 py-0.5">
                  1111.com.tw
                </span>
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
            <div className="mt-4 space-y-4">
              <p className="text-charcoal/60 text-sm">{t('textDescription')}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={t('jobTitle')}
                  placeholder={t('jobTitlePlaceholder')}
                  value={jobTitle}
                  onValueChange={setJobTitle}
                  isDisabled={isLoading}
                  isRequired
                  classNames={{
                    input: 'text-charcoal',
                    inputWrapper: 'border-warm-gray/30 bg-white/80',
                    label: 'text-charcoal/70',
                  }}
                />
                <Input
                  label={t('company')}
                  placeholder={t('companyPlaceholder')}
                  value={company}
                  onValueChange={setCompany}
                  isDisabled={isLoading}
                  classNames={{
                    input: 'text-charcoal',
                    inputWrapper: 'border-warm-gray/30 bg-white/80',
                    label: 'text-charcoal/70',
                  }}
                />
              </div>
              <Textarea
                label={t('description')}
                placeholder={t('descriptionPlaceholder')}
                value={description}
                onValueChange={setDescription}
                isDisabled={isLoading}
                isRequired
                minRows={4}
                maxRows={8}
                classNames={{
                  input: 'text-charcoal',
                  inputWrapper: 'border-warm-gray/30 bg-white/80',
                  label: 'text-charcoal/70',
                }}
              />
              <div className="flex justify-end">
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
      </CardBody>
    </Card>
  );
}
