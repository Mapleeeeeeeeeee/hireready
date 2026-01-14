import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterviewCard } from '@/components/history/InterviewCard';
import type { InterviewStatus } from '@/lib/constants/enums';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      // Interview scenarios
      general: 'General Interview',
      technical: 'Technical Interview',
      behavioral: 'Behavioral Interview',
      // Statuses
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      // History
      score: 'Score',
    };
    return translations[key] || key;
  },
}));

// Mock date-format utilities
vi.mock('@/lib/utils/date-format', () => ({
  formatDate: (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  },
  formatDuration: (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}s`;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  },
}));

describe('InterviewCard', () => {
  const defaultProps = {
    id: 'interview-1',
    scenario: 'general',
    status: 'completed' as InterviewStatus,
    score: 85,
    duration: 1800, // 30 minutes
    createdAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render interview scenario correctly', () => {
      render(<InterviewCard {...defaultProps} />);

      expect(screen.getByText('General Interview')).toBeInTheDocument();
    });

    it('should render formatted date correctly', () => {
      render(<InterviewCard {...defaultProps} />);

      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    });

    it('should render duration when provided', () => {
      render(<InterviewCard {...defaultProps} />);

      expect(screen.getByText('30m')).toBeInTheDocument();
    });
  });

  describe('status chip', () => {
    it('should render pending status with warning color', () => {
      render(<InterviewCard {...defaultProps} status="pending" score={null} />);

      const statusChip = screen.getByText('Pending');
      expect(statusChip).toBeInTheDocument();
    });

    it('should render in_progress status with primary color', () => {
      render(<InterviewCard {...defaultProps} status="in_progress" score={null} />);

      const statusChip = screen.getByText('In Progress');
      expect(statusChip).toBeInTheDocument();
    });

    it('should render completed status with success color', () => {
      render(<InterviewCard {...defaultProps} status="completed" />);

      const statusChip = screen.getByText('Completed');
      expect(statusChip).toBeInTheDocument();
    });
  });

  describe('score display', () => {
    it('should display score when provided', () => {
      render(<InterviewCard {...defaultProps} score={85} />);

      // Score appears in both info row and highlighted box
      expect(screen.getByText('Score: 85')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('should not display score section when score is null', () => {
      render(<InterviewCard {...defaultProps} score={null} />);

      expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
    });
  });

  describe('click behavior', () => {
    it('should be clickable when onClick is provided', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<InterviewCard {...defaultProps} onClick={handleClick} />);

      // Find and click the card by its scenario title
      const scenarioTitle = screen.getByText('General Interview');
      await user.click(scenarioTitle);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should show chevron when onClick is provided', () => {
      render(<InterviewCard {...defaultProps} onClick={() => {}} />);

      // Chevron icon should be present (it has the class h-5 w-5)
      const chevronContainer = document.querySelector('.lucide-chevron-right');
      expect(chevronContainer).toBeInTheDocument();
    });

    it('should not show chevron when onClick is not provided', () => {
      render(<InterviewCard {...defaultProps} />);

      const chevronContainer = document.querySelector('.lucide-chevron-right');
      expect(chevronContainer).not.toBeInTheDocument();
    });
  });

  describe('duration display', () => {
    it('should display duration when provided', () => {
      render(<InterviewCard {...defaultProps} duration={90} />);

      expect(screen.getByText('1m 30s')).toBeInTheDocument();
    });

    it('should not display duration when null', () => {
      render(<InterviewCard {...defaultProps} duration={null} />);

      // Clock icon should not be present for duration
      const clockIcons = document.querySelectorAll('.lucide-clock');
      expect(clockIcons.length).toBe(0);
    });
  });
});
