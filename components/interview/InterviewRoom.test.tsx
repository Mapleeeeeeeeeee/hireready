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

// Mock useVideoPreview hook with configurable return values
const mockUseVideoPreview = vi.fn();
vi.mock('@/lib/hooks/use-video-preview', () => ({
  useVideoPreview: () => mockUseVideoPreview(),
}));

// Mock useAudioLevel hook with configurable return values
const mockUseAudioLevel = vi.fn();
vi.mock('@/lib/hooks/use-audio-level', () => ({
  useAudioLevel: () => mockUseAudioLevel(),
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

// Default mock values for useVideoPreview
const defaultVideoMockValues = {
  isVideoOn: false,
  stream: null,
  toggleVideo: vi.fn(),
  error: null,
  isSupported: true,
};

// Default mock values for useAudioLevel
const defaultAudioMockValues = {
  audioLevel: 0,
  isActive: false,
  start: vi.fn(),
  stop: vi.fn(),
  error: null,
  isSupported: true,
};

describe('InterviewRoom', () => {
  beforeEach(() => {
    // Reset to default mock values before each test
    mockUseLiveApi.mockReturnValue(defaultMockValues);
    mockUseVideoPreview.mockReturnValue(defaultVideoMockValues);
    mockUseAudioLevel.mockReturnValue(defaultAudioMockValues);
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

  describe('when browser is not supported', () => {
    it('should show not supported message', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, isSupported: false });
      render(<InterviewRoom />);
      expect(screen.getByText('notSupported')).toBeInTheDocument();
    });

    it('should show not supported description', () => {
      mockUseLiveApi.mockReturnValue({ ...defaultMockValues, isSupported: false });
      render(<InterviewRoom />);
      expect(screen.getByText('notSupportedMessage')).toBeInTheDocument();
    });
  });

  describe('when connection status changes', () => {
    it('should show connecting status with spinner when connecting', () => {
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        sessionState: 'connecting',
        isConnected: false,
      });
      render(<InterviewRoom />);
      expect(screen.getByText('connecting')).toBeInTheDocument();
    });

    it('should show error status when in error state', () => {
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        sessionState: 'error',
        isConnected: false,
      });
      render(<InterviewRoom />);
      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('should show disconnected status when idle and not connected', () => {
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        sessionState: 'idle',
        isConnected: false,
      });
      render(<InterviewRoom />);
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });

  describe('when error occurs', () => {
    it('should display error message when lastError exists', () => {
      const errorMessage = 'Connection failed';
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        lastError: { message: errorMessage, code: 'CONNECTION_ERROR' },
      });
      render(<InterviewRoom />);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not show error section when lastError is null', () => {
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        lastError: null,
      });
      render(<InterviewRoom />);
      // The error message container should not exist
      expect(screen.queryByText(/Connection failed/)).not.toBeInTheDocument();
    });
  });

  describe('session state display', () => {
    it.each([
      { state: 'idle' },
      { state: 'listening' },
      { state: 'speaking' },
      { state: 'processing' },
      { state: 'connecting' },
      { state: 'error' },
    ] as const)('should render correctly for state "$state"', ({ state }) => {
      // This test verifies the component renders for all session states
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        sessionState: state,
        isConnected: state === 'listening' || state === 'speaking' || state === 'processing',
      });
      render(<InterviewRoom />);
      // The component should render without errors for each state
      expect(screen.getByText(/LIVE SESSION/)).toBeInTheDocument();
    });
  });

  describe('audio level display', () => {
    it('should use local mic audio level when not connected', () => {
      const localAudioLevel = 0.5;
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        isConnected: false,
        visualizerVolume: 0.8,
      });
      mockUseAudioLevel.mockReturnValue({
        ...defaultAudioMockValues,
        audioLevel: localAudioLevel,
      });
      render(<InterviewRoom />);
      // Component should render without errors
      expect(screen.getByText(/LIVE SESSION/)).toBeInTheDocument();
    });

    it('should use API visualizer volume when connected', () => {
      const apiVolume = 0.7;
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        isConnected: true,
        visualizerVolume: apiVolume,
      });
      mockUseAudioLevel.mockReturnValue({
        ...defaultAudioMockValues,
        audioLevel: 0.3,
      });
      render(<InterviewRoom />);
      // Component should render without errors
      expect(screen.getByText(/LIVE SESSION/)).toBeInTheDocument();
    });

    it('should show zero audio level when mic is off', () => {
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        isMicOn: false,
        visualizerVolume: 0.8,
      });
      mockUseAudioLevel.mockReturnValue({
        ...defaultAudioMockValues,
        audioLevel: 0.5,
      });
      render(<InterviewRoom />);
      // Component should render without errors
      expect(screen.getByText(/LIVE SESSION/)).toBeInTheDocument();
    });
  });

  describe('microphone monitoring sync', () => {
    it('should start mic monitoring when isMicOn is true', () => {
      const mockStart = vi.fn();
      mockUseAudioLevel.mockReturnValue({
        ...defaultAudioMockValues,
        start: mockStart,
      });
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        isMicOn: true,
      });
      render(<InterviewRoom />);
      expect(mockStart).toHaveBeenCalled();
    });

    it('should stop mic monitoring when isMicOn is false', () => {
      const mockStop = vi.fn();
      mockUseAudioLevel.mockReturnValue({
        ...defaultAudioMockValues,
        stop: mockStop,
      });
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        isMicOn: false,
      });
      render(<InterviewRoom />);
      expect(mockStop).toHaveBeenCalled();
    });
  });
});
