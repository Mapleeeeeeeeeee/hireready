import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InterviewRoom } from '@/components/interview/InterviewRoom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useLiveApi hook with configurable return values
const mockUseLiveApi = vi.fn();
vi.mock('@/lib/hooks/use-live-api', () => ({
  useLiveApi: () => mockUseLiveApi(),
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
      'states.connecting': 'Connecting',
      'states.error': 'Error',
    };
    return translations[key] || key;
  },
  useLocale: () => 'zh-TW',
}));

// Default mock values for useLiveApi
const defaultMockValues = {
  sessionState: 'idle' as const,
  isConnected: true,
  isMicOn: true,
  visualizerVolume: 0,
  elapsedSeconds: 0,
  lastError: null,
  isSupported: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  toggleMic: vi.fn(),
  sendText: vi.fn(),
};

describe('InterviewRoom', () => {
  beforeEach(() => {
    // Reset to default mock values before each test
    mockUseLiveApi.mockReturnValue(defaultMockValues);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  describe('when timer displays elapsed time', () => {
    it('should display 00:00 when elapsedSeconds is 0', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, elapsedSeconds: 0 });
      render(<InterviewRoom />);
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
    });

    it.each([
      { seconds: 1, expected: '00:01' },
      { seconds: 59, expected: '00:59' },
      { seconds: 60, expected: '01:00' },
      { seconds: 65, expected: '01:05' },
      { seconds: 600, expected: '10:00' },
    ])('should display "$expected" when elapsedSeconds is $seconds', ({ seconds, expected }) => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, elapsedSeconds: seconds });
      render(<InterviewRoom />);
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    });
  });

  describe('when displaying audio visualizer', () => {
    it('should show Ready state on initial render', () => {
      render(<InterviewRoom />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should show Listening state when session is listening', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, sessionState: 'listening' });
      render(<InterviewRoom />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should show Speaking state when AI is speaking', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, sessionState: 'speaking' });
      render(<InterviewRoom />);
      expect(screen.getByText('Speaking')).toBeInTheDocument();
    });
  });

  describe('when rendering control bar', () => {
    it('should show mic in on state by default', () => {
      render(<InterviewRoom />);
      expect(screen.getByLabelText('Mute Microphone')).toBeInTheDocument();
    });

    it('should show unmute option when mic is off', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, isMicOn: false });
      render(<InterviewRoom />);
      expect(screen.getByLabelText('Unmute Microphone')).toBeInTheDocument();
    });

    it('should show video in off state by default for privacy', () => {
      render(<InterviewRoom />);
      expect(screen.getByLabelText('Turn On Camera')).toBeInTheDocument();
    });
  });

  describe('when session state changes', () => {
    it('should display connecting state', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, sessionState: 'connecting' });
      render(<InterviewRoom />);
      expect(screen.getByText('Connecting')).toBeInTheDocument();
    });

    it('should display error state', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, sessionState: 'error' });
      render(<InterviewRoom />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
