import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { InterviewRoom } from '@/components/interview/InterviewRoom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      liveSession: 'LIVE SESSION',
      connected: 'Connected',
      muteMic: 'Mute Microphone',
      unmuteMic: 'Unmute Microphone',
      turnOffCamera: 'Turn Off Camera',
      turnOnCamera: 'Turn On Camera',
      endCall: 'End Interview',
      'states.idle': 'Ready',
      'states.listening': 'Listening',
      'states.speaking': 'Speaking',
      'states.processing': 'Processing',
    };
    return translations[key] || key;
  },
}));

describe('InterviewRoom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when rendering header section', () => {
    it('should display live session indicator', () => {
      render(<InterviewRoom />);
      expect(screen.getByText(/LIVE SESSION/)).toBeInTheDocument();
    });

    it('should display connected status', () => {
      render(<InterviewRoom />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('when timer is running', () => {
    it('should start at 00:00', () => {
      render(<InterviewRoom />);
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
    });

    it.each([
      { seconds: 1, expected: '00:01' },
      { seconds: 59, expected: '00:59' },
      { seconds: 60, expected: '01:00' },
      { seconds: 65, expected: '01:05' },
      { seconds: 600, expected: '10:00' },
    ])('should display "$expected" after $seconds seconds', ({ seconds, expected }) => {
      render(<InterviewRoom />);

      act(() => {
        vi.advanceTimersByTime(seconds * 1000);
      });

      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    });
  });

  describe('when displaying audio visualizer', () => {
    it('should show Ready state on initial render', () => {
      render(<InterviewRoom />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('when rendering control bar', () => {
    it('should show mic in on state by default', () => {
      render(<InterviewRoom />);
      expect(screen.getByLabelText('Mute Microphone')).toBeInTheDocument();
    });

    it('should show video in off state by default for privacy', () => {
      render(<InterviewRoom />);
      expect(screen.getByLabelText('Turn On Camera')).toBeInTheDocument();
    });
  });
});
