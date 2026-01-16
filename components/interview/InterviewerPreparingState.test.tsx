import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InterviewerPreparingState } from '@/components/interview/InterviewerPreparingState';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      interviewerPreparing: '面試官正在準備中...',
      preparingDescription: '請稍候，面試即將開始',
      interviewerReady: '面試官已經準備好了',
      readyDescription: '點擊下方按鈕開始面試',
      startButton: '開始面試',
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('InterviewerPreparingState', () => {
  describe('basic rendering', () => {
    it('should display interviewer avatar', () => {
      render(<InterviewerPreparingState />);
      // Avatar is rendered with Bot icon inside
      const avatar = document.querySelector('[class*="bg-terracotta"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should display progress bar', () => {
      render(<InterviewerPreparingState />);
      expect(screen.getByLabelText('Parsing progress')).toBeInTheDocument();
    });

    it('should display preparing text when not ready', () => {
      render(<InterviewerPreparingState isReady={false} />);
      expect(screen.getByText('面試官正在準備中...')).toBeInTheDocument();
      expect(screen.getByText('請稍候，面試即將開始')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const customClass = 'custom-test-class';
      const { container } = render(<InterviewerPreparingState className={customClass} />);
      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  describe('fake progress animation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start at 0%', () => {
      render(<InterviewerPreparingState />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should increase progress over time', async () => {
      render(<InterviewerPreparingState />);

      // Initial progress should be 0
      expect(screen.getByText('0%')).toBeInTheDocument();

      // Advance time by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Progress should be greater than 0 after 5 seconds
      const progressText = screen.getByText(/%$/);
      const progressValue = parseInt(progressText.textContent || '0');
      expect(progressValue).toBeGreaterThan(0);
    });

    it('should cap progress at 99% before isReady', async () => {
      render(<InterviewerPreparingState isReady={false} />);

      // Advance time past the animation duration (30 seconds)
      await act(async () => {
        vi.advanceTimersByTime(35000);
      });

      // Progress should not exceed 99%
      expect(screen.getByText('99%')).toBeInTheDocument();
    });

    it('should progress slower at the end due to easeOutQuad', async () => {
      // easeOutQuad formula: t * (2 - t)
      // At t=0.166 (5s/30s): 0.166 * (2 - 0.166) = 0.305 → ~30%
      // At t=0.833 (25s/30s): 0.833 * (2 - 0.833) = 0.972 → ~96%
      // At t=1.0 (30s/30s): 1.0 * (2 - 1.0) = 1.0 → 99% (capped)
      // Progress from 0-5s: ~30%
      // Progress from 25-30s: 99% - 96% = ~3%
      // This demonstrates easeOutQuad: fast at start, slow at end

      const { unmount } = render(<InterviewerPreparingState />);

      // Advance to 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      const progressAt5s = parseInt(screen.getByText(/%$/).textContent || '0');
      unmount();

      // Create fresh instance and advance to 25 seconds
      const { unmount: unmount2 } = render(<InterviewerPreparingState />);
      await act(async () => {
        vi.advanceTimersByTime(25000);
      });
      const progressAt25s = parseInt(screen.getByText(/%$/).textContent || '0');

      // Advance another 5 seconds (to 30 seconds total)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      const progressAt30s = parseInt(screen.getByText(/%$/).textContent || '0');
      unmount2();

      // First 5 seconds should have more progress than last 5 seconds (easeOutQuad effect)
      const progressIn0To5s = progressAt5s;
      const progressIn25To30s = progressAt30s - progressAt25s;

      expect(progressIn0To5s).toBeGreaterThan(progressIn25To30s);
    });

    it('should use real progress when it exceeds fake progress', async () => {
      const highProgress = 80;
      render(<InterviewerPreparingState progress={highProgress} />);

      // At the start, fake progress is 0, but real progress is 80
      // So display should show 80
      expect(screen.getByText(`${highProgress}%`)).toBeInTheDocument();
    });
  });

  describe('isReady state switching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should display preparing message when isReady is false', () => {
      render(<InterviewerPreparingState isReady={false} />);
      expect(screen.getByText('面試官正在準備中...')).toBeInTheDocument();
      expect(screen.getByText('請稍候，面試即將開始')).toBeInTheDocument();
    });

    it('should display ready message when isReady is true', () => {
      render(<InterviewerPreparingState isReady={true} />);
      expect(screen.getByText('面試官已經準備好了')).toBeInTheDocument();
      expect(screen.getByText('點擊下方按鈕開始面試')).toBeInTheDocument();
    });

    it('should display 100% progress when isReady is true', () => {
      render(<InterviewerPreparingState isReady={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display 100% progress when isReady is true regardless of fake progress', async () => {
      render(<InterviewerPreparingState isReady={true} />);

      // Even after waiting, progress should stay at 100%
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display start button when isReady is true', () => {
      render(<InterviewerPreparingState isReady={true} />);
      expect(screen.getByRole('button', { name: '開始面試' })).toBeInTheDocument();
    });

    it('should not display start button when isReady is false', () => {
      render(<InterviewerPreparingState isReady={false} />);
      expect(screen.queryByRole('button', { name: '開始面試' })).not.toBeInTheDocument();
    });
  });

  describe('button interaction', () => {
    it('should trigger onStart callback when start button is clicked', () => {
      const mockOnStart = vi.fn();
      render(<InterviewerPreparingState isReady={true} onStart={mockOnStart} />);

      const startButton = screen.getByRole('button', { name: '開始面試' });
      fireEvent.click(startButton);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when start button is clicked without onStart prop', () => {
      render(<InterviewerPreparingState isReady={true} />);

      const startButton = screen.getByRole('button', { name: '開始面試' });

      // Should not throw
      expect(() => fireEvent.click(startButton)).not.toThrow();
    });
  });

  describe('animated dots', () => {
    it('should display animated dots when isReady is false', () => {
      const { container } = render(<InterviewerPreparingState isReady={false} />);

      // Find the dots container (div with flex and gap-1)
      const dotsContainer = container.querySelector('.flex.gap-1');
      expect(dotsContainer).toBeInTheDocument();

      // Should have 3 dots
      const dots = dotsContainer?.querySelectorAll('[class*="rounded-full"]');
      expect(dots).toHaveLength(3);
    });

    it('should not display animated dots when isReady is true', () => {
      const { container } = render(<InterviewerPreparingState isReady={true} />);

      // The dots container should not exist when ready
      const dotsContainer = container.querySelector('.flex.gap-1');
      expect(dotsContainer).not.toBeInTheDocument();
    });
  });

  describe('progress display logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show max of fake progress and real progress', async () => {
      // Real progress is 30
      const { rerender } = render(<InterviewerPreparingState progress={30} isReady={false} />);

      // Initially, fake progress is 0, real progress is 30, so display should be 30
      expect(screen.getByText('30%')).toBeInTheDocument();

      // Advance time until fake progress exceeds 30
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Now fake progress should be higher, so we should see a value > 30
      rerender(<InterviewerPreparingState progress={30} isReady={false} />);
      const progressText = screen.getByText(/%$/);
      const progressValue = parseInt(progressText.textContent || '0');
      expect(progressValue).toBeGreaterThan(30);
    });

    it('should jump to 100% immediately when isReady becomes true', async () => {
      const { rerender } = render(<InterviewerPreparingState progress={50} isReady={false} />);

      // Advance time a bit
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Progress should be around 50% (max of fake and real)
      const progressText = screen.getByText(/%$/);
      const progressValue = parseInt(progressText.textContent || '0');
      expect(progressValue).toBeLessThan(100);

      // Now set isReady to true
      rerender(<InterviewerPreparingState progress={50} isReady={true} />);

      // Progress should jump to 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('default props', () => {
    it('should use default progress of 0', () => {
      render(<InterviewerPreparingState />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should use default isReady of false', () => {
      render(<InterviewerPreparingState />);
      expect(screen.getByText('面試官正在準備中...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '開始面試' })).not.toBeInTheDocument();
    });

    it('should use default empty className', () => {
      const { container } = render(<InterviewerPreparingState />);
      // Should have base classes but no extra custom class
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('min-h-screen');
    });
  });
});
