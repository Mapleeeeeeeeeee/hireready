'use client';

import { useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { User, Bot, MessageSquare } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface TranscriptEntry {
  /** Role of the speaker */
  role: 'user' | 'assistant';
  /** The spoken text */
  text: string;
  /** Optional timestamp in milliseconds from start */
  timestamp?: number;
}

export interface TranscriptViewerProps {
  /** Array of transcript entries */
  transcript: TranscriptEntry[];
  /** Whether to hide the header */
  hideHeader?: boolean;
}

// ============================================================
// Helper Components
// ============================================================

function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const tAi = useTranslations('interview.room.ai');
  const tVideo = useTranslations('interview.room.video');
  const isUser = entry.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-soft-clay text-charcoal' : 'bg-terracotta/10 text-terracotta'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message bubble */}
      <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Speaker label */}
        <div className="text-charcoal/50 flex items-center gap-2 text-xs">
          <span>{isUser ? tVideo('you') : tAi('name')}</span>
        </div>

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-charcoal rounded-tr-md text-white'
              : 'bg-soft-clay/50 text-charcoal rounded-tl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('history.transcript');

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-warm-gray/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <MessageSquare className="text-charcoal/30 h-8 w-8" />
      </div>
      <p className="text-charcoal/50 text-sm">{t('emptyTranscript')}</p>
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function TranscriptViewer({ transcript, hideHeader = false }: TranscriptViewerProps) {
  const t = useTranslations('history.transcript');

  const isEmpty = transcript.length === 0;

  return (
    <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
      {!hideHeader && (
        <>
          <CardHeader className="flex items-center gap-2 pb-2">
            <MessageSquare className="text-terracotta h-5 w-5" />
            <h3 className="text-charcoal text-lg font-semibold">{t('title')}</h3>
            {!isEmpty && (
              <span className="text-charcoal/40 text-sm">
                ({transcript.length} {t('messages')})
              </span>
            )}
          </CardHeader>

          <Divider className="bg-warm-gray/20" />
        </>
      )}

      <CardBody className="p-0">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {transcript.map((entry, index) => (
              <TranscriptMessage key={index} entry={entry} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
