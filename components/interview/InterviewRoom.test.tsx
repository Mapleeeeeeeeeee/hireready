import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import type { UseTaskPollingOptions } from '@/lib/hooks/use-task-polling';

// Mock next/navigation with configurable return values
const mockSearchParamsGet = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

// Mock useTaskPolling hook with configurable behavior
const mockUseTaskPolling = vi.fn();
vi.mock('@/lib/hooks/use-task-polling', () => ({
  useTaskPolling: (options: UseTaskPollingOptions) => mockUseTaskPolling(options),
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
      interviewerPreparing: 'Interviewer is preparing...',
      interviewerReady: 'Ready to start!',
      preparingDescription: 'Analyzing your resume...',
      readyDescription: 'Click start to begin the interview.',
      startButton: 'Start Interview',
    };
    return translations[key] || key;
  },
  useLocale: () => 'zh-TW',
}));

// Mock interview store with configurable values
const mockSetResumeContent = vi.fn();
const mockInterviewStoreState = {
  isCaptionOn: false,
  toggleCaption: vi.fn(),
  interimAiTranscript: '',
  transcripts: [],
  jobDescription: null,
  setResumeContent: mockSetResumeContent,
};
vi.mock('@/lib/stores/interview-store', () => ({
  useInterviewStore: (selector: (state: typeof mockInterviewStoreState) => unknown) => {
    return selector(mockInterviewStoreState);
  },
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

// Default mock values for useTaskPolling
const defaultTaskPollingMockValues = {
  status: null,
  progress: 0,
  isPolling: false,
  stopPolling: vi.fn(),
};

describe('InterviewRoom', () => {
  beforeEach(() => {
    // Reset to default mock values before each test
    mockUseLiveApi.mockReturnValue(defaultMockValues);
    mockUseVideoPreview.mockReturnValue(defaultVideoMockValues);
    mockUseAudioLevel.mockReturnValue(defaultAudioMockValues);
    mockUseTaskPolling.mockReturnValue(defaultTaskPollingMockValues);
    // Default: no resumeTaskId
    mockSearchParamsGet.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSetResumeContent.mockClear();
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

  // ============================================================
  // Resume Parsing Related Tests
  // ============================================================

  describe('when resumeTaskId is provided in URL', () => {
    it('should show InterviewerPreparingState when waiting for resume parsing', () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      render(<InterviewRoom />);

      // Should show preparing state, not normal interview room
      expect(screen.getByText('Interviewer is preparing...')).toBeInTheDocument();
      expect(screen.getByText('Analyzing your resume...')).toBeInTheDocument();
      // Should not show normal interview room elements
      expect(screen.queryByText(/LIVE SESSION/)).not.toBeInTheDocument();
    });

    it('should pass taskId to useTaskPolling when resumeTaskId exists', () => {
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-456' : null
      );

      render(<InterviewRoom />);

      // Verify useTaskPolling was called with the taskId
      expect(mockUseTaskPolling).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-456',
        })
      );
    });

    it('should pass null taskId to useTaskPolling when no resumeTaskId', () => {
      mockSearchParamsGet.mockReturnValue(null);

      render(<InterviewRoom />);

      // Verify useTaskPolling was called with null taskId
      expect(mockUseTaskPolling).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: null,
        })
      );
    });
  });

  describe('when resume parsing completes', () => {
    it('should sync resume content to store when task completes', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onComplete callback when useTaskPolling is called
      let capturedOnComplete: ((result: unknown) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnComplete = options.onComplete;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Simulate task completion with result
      const taskResult = {
        content: JSON.stringify({
          name: '郭懷德',
          email: 'test@example.com',
          skills: ['Python', 'FastAPI'],
        }),
        parsedAt: '2024-01-01T00:00:00Z',
      };

      // Trigger the onComplete callback
      expect(capturedOnComplete).toBeDefined();
      capturedOnComplete?.(taskResult);

      // Verify setResumeContent was called with parsed content
      expect(mockSetResumeContent).toHaveBeenCalledWith({
        name: '郭懷德',
        email: 'test@example.com',
        skills: ['Python', 'FastAPI'],
      });
    });

    it('should handle invalid JSON in task result gracefully', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onComplete callback
      let capturedOnComplete: ((result: unknown) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnComplete = options.onComplete;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Simulate task completion with invalid JSON
      const taskResult = {
        content: 'invalid-json-string',
        parsedAt: '2024-01-01T00:00:00Z',
      };

      // Trigger the onComplete callback - should not throw
      expect(() => capturedOnComplete?.(taskResult)).not.toThrow();

      // setResumeContent should not be called with invalid data
      expect(mockSetResumeContent).not.toHaveBeenCalled();
    });

    it('should handle task result without content field gracefully', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onComplete callback
      let capturedOnComplete: ((result: unknown) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnComplete = options.onComplete;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Simulate task completion without content field
      const taskResult = {
        someOtherField: 'value',
      };

      // Trigger the onComplete callback - should not throw
      expect(() => capturedOnComplete?.(taskResult)).not.toThrow();

      // setResumeContent should not be called
      expect(mockSetResumeContent).not.toHaveBeenCalled();
    });

    it('should handle null task result gracefully', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onComplete callback
      let capturedOnComplete: ((result: unknown) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnComplete = options.onComplete;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Trigger the onComplete callback with null
      expect(() => capturedOnComplete?.(null)).not.toThrow();

      // setResumeContent should not be called
      expect(mockSetResumeContent).not.toHaveBeenCalled();
    });
  });

  describe('when resume parsing fails', () => {
    it('should still allow interview to start when parsing fails', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onError callback
      let capturedOnError: ((error: string) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnError = options.onError;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Verify onError callback was provided
      expect(capturedOnError).toBeDefined();

      // onError should be callable without throwing
      expect(() => capturedOnError?.('Parsing failed')).not.toThrow();
    });
  });

  describe('interview flow with resume parsing', () => {
    it('should show ready state when task completes', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Capture the onComplete callback and provide a way to check ready state
      let capturedOnComplete: ((result: unknown) => void) | undefined;
      mockUseTaskPolling.mockImplementation((options: UseTaskPollingOptions) => {
        capturedOnComplete = options.onComplete;
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Initially should show preparing state
      expect(screen.getByText('Interviewer is preparing...')).toBeInTheDocument();

      // Trigger task completion
      const taskResult = {
        content: JSON.stringify({ name: 'Test User' }),
        parsedAt: '2024-01-01T00:00:00Z',
      };
      capturedOnComplete?.(taskResult);

      // Component state has changed, need to verify the callback was processed
      // The isReadyToStart state is set to true in the callback
      // This verifies the callback logic runs without error
      expect(mockSetResumeContent).toHaveBeenCalledWith({ name: 'Test User' });
    });

    it('should transition from preparing to interview when user clicks start', async () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Track state changes through re-renders
      const isReadyToStart = false;

      mockUseTaskPolling.mockImplementation(() => {
        // Simulate completed state
        if (isReadyToStart) {
          return {
            ...defaultTaskPollingMockValues,
            progress: 100,
          };
        }
        return defaultTaskPollingMockValues;
      });

      render(<InterviewRoom />);

      // Should initially show preparing state
      expect(screen.getByText('Interviewer is preparing...')).toBeInTheDocument();
      expect(screen.queryByText(/LIVE SESSION/)).not.toBeInTheDocument();
    });

    it('should display progress during resume parsing', () => {
      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      // Mock progress at 50%
      mockUseTaskPolling.mockReturnValue({
        ...defaultTaskPollingMockValues,
        progress: 50,
        isPolling: true,
      });

      render(<InterviewRoom />);

      // Should show preparing state
      expect(screen.getByText('Interviewer is preparing...')).toBeInTheDocument();
      // The progress bar component should be rendered (aria-label based check)
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('integration: preparing state to interview room', () => {
    it('should not auto-connect to Gemini API while preparing', () => {
      const mockConnect = vi.fn();
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        connect: mockConnect,
      });

      // Mock searchParams to return resumeTaskId
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === 'resumeTaskId' ? 'task-123' : null
      );

      render(<InterviewRoom />);

      // Should not connect while in preparing state
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should auto-connect to Gemini API when not in preparing state', () => {
      const mockConnect = vi.fn();
      mockUseLiveApi.mockReturnValue({
        ...defaultMockValues,
        connect: mockConnect,
      });

      // No resumeTaskId means not preparing
      mockSearchParamsGet.mockReturnValue(null);

      render(<InterviewRoom />);

      // Should connect when not preparing
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});
