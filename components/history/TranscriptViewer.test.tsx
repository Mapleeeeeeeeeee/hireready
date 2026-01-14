import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptViewer, type TranscriptEntry } from '@/components/history/TranscriptViewer';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      // Transcript
      title: 'Transcript',
      messages: 'messages',
      emptyTranscript: 'No transcript available',
      // AI and Video
      name: 'AI Interviewer',
      you: 'You',
    };
    return translations[key] || key;
  },
}));

// Mock date-format utilities
vi.mock('@/lib/utils/date-format', () => ({
  formatTimestamp: (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },
}));

describe('TranscriptViewer', () => {
  const sampleTranscript: TranscriptEntry[] = [
    {
      role: 'assistant',
      text: 'Hello, welcome to the interview.',
      timestamp: 0,
    },
    {
      role: 'user',
      text: 'Thank you for having me.',
      timestamp: 5000,
    },
    {
      role: 'assistant',
      text: 'Can you tell me about yourself?',
      timestamp: 10000,
    },
  ];

  describe('empty state', () => {
    it('should display empty state when transcript is empty', () => {
      render(<TranscriptViewer transcript={[]} />);

      expect(screen.getByText('No transcript available')).toBeInTheDocument();
    });

    it('should not display message count when transcript is empty', () => {
      render(<TranscriptViewer transcript={[]} />);

      expect(screen.queryByText(/messages/)).not.toBeInTheDocument();
    });
  });

  describe('transcript rendering', () => {
    it('should render all transcript messages', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      expect(screen.getByText('Hello, welcome to the interview.')).toBeInTheDocument();
      expect(screen.getByText('Thank you for having me.')).toBeInTheDocument();
      expect(screen.getByText('Can you tell me about yourself?')).toBeInTheDocument();
    });

    it('should display correct message count', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      expect(screen.getByText('(3 messages)')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });
  });

  describe('message styling', () => {
    it('should render user messages with correct label', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      // User label appears for user messages
      expect(screen.getAllByText('You').length).toBeGreaterThan(0);
    });

    it('should render assistant messages with correct label', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      // AI Interviewer label appears for assistant messages
      expect(screen.getAllByText('AI Interviewer').length).toBeGreaterThan(0);
    });

    it('should render timestamps when provided', () => {
      render(<TranscriptViewer transcript={sampleTranscript} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('00:05')).toBeInTheDocument();
      expect(screen.getByText('00:10')).toBeInTheDocument();
    });
  });

  describe('message without timestamp', () => {
    it('should render message without timestamp when not provided', () => {
      const transcriptWithoutTimestamp: TranscriptEntry[] = [
        {
          role: 'user',
          text: 'Message without timestamp',
        },
      ];

      render(<TranscriptViewer transcript={transcriptWithoutTimestamp} />);

      expect(screen.getByText('Message without timestamp')).toBeInTheDocument();
      // Should not have any timestamp formatted as MM:SS
      expect(screen.queryByText(/^\d{2}:\d{2}$/)).not.toBeInTheDocument();
    });
  });

  describe('single message', () => {
    it('should render single message correctly', () => {
      const singleMessage: TranscriptEntry[] = [
        {
          role: 'assistant',
          text: 'Welcome!',
        },
      ];

      render(<TranscriptViewer transcript={singleMessage} />);

      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('(1 messages)')).toBeInTheDocument();
    });
  });
});
