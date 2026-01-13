import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPreview } from '@/components/interview/VideoPreview';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      cameraOff: 'Camera Off',
      cameraOffHint: 'Click button below to turn on camera',
      loadingCamera: 'Loading camera...',
      you: 'You',
      live: 'LIVE',
    };
    return translations[key] || key;
  },
}));

const mockStream = {
  getTracks: () => [],
} as unknown as MediaStream;

describe('VideoPreview', () => {
  describe('when camera is off', () => {
    it('should show camera off placeholder text', () => {
      render(<VideoPreview stream={null} isVideoOn={false} />);
      expect(screen.getByText('Camera Off')).toBeInTheDocument();
    });

    it('should show hint text to turn on camera', () => {
      render(<VideoPreview stream={null} isVideoOn={false} />);
      expect(screen.getByText('Click button below to turn on camera')).toBeInTheDocument();
    });

    it('should not show video element', () => {
      render(<VideoPreview stream={null} isVideoOn={false} />);
      expect(screen.queryByRole('video')).not.toBeInTheDocument();
    });

    it('should not show LIVE indicator', () => {
      render(<VideoPreview stream={null} isVideoOn={false} />);
      expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    });
  });

  describe('when camera is on with stream', () => {
    it('should show video element', () => {
      render(<VideoPreview stream={mockStream} isVideoOn={true} />);
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should show LIVE indicator', () => {
      render(<VideoPreview stream={mockStream} isVideoOn={true} />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('should show user label like Google Meet', () => {
      render(<VideoPreview stream={mockStream} isVideoOn={true} />);
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should apply mirror transform for natural self-viewing', () => {
      render(<VideoPreview stream={mockStream} isVideoOn={true} />);
      const video = document.querySelector('video');
      expect(video).toHaveStyle({ transform: 'scaleX(-1)' });
    });
  });

  describe('when camera is on but stream is loading', () => {
    it('should show loading placeholder', () => {
      render(<VideoPreview stream={null} isVideoOn={true} />);
      expect(screen.getByText('Loading camera...')).toBeInTheDocument();
    });

    it('should not show video element while loading', () => {
      render(<VideoPreview stream={null} isVideoOn={true} />);
      expect(document.querySelector('video')).not.toBeInTheDocument();
    });
  });

  describe('audio indicator', () => {
    it('should always show user label with audio indicator', () => {
      render(<VideoPreview stream={null} isVideoOn={false} />);
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should render audio indicator bars', () => {
      const { container } = render(
        <VideoPreview
          stream={mockStream}
          isVideoOn={true}
          sessionState="speaking"
          audioLevel={0.5}
        />
      );
      // 5 bars in audio indicator
      const bars = container.querySelectorAll('.bg-green-400');
      expect(bars.length).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should display error message when error occurs', () => {
      const testError = new Error('Camera permission denied');
      render(<VideoPreview stream={null} isVideoOn={false} error={testError} />);
      expect(screen.getByText('Camera permission denied')).toBeInTheDocument();
    });
  });

  describe('when video state changes', () => {
    it.each([
      { isVideoOn: true, stream: mockStream, expectedText: 'LIVE' },
      { isVideoOn: false, stream: null, expectedText: 'Camera Off' },
      { isVideoOn: true, stream: null, expectedText: 'Loading camera...' },
    ])(
      'should show "$expectedText" when isVideoOn is $isVideoOn and stream is $stream',
      ({ isVideoOn, stream, expectedText }) => {
        render(<VideoPreview stream={stream} isVideoOn={isVideoOn} />);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      }
    );
  });
});
