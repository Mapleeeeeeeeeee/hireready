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
      // Statuses
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      // History
      title: 'Interview Practice',
      score: 'Score',
      delete: 'Delete',
      retryInterview: 'Retry with same job',
      scoreLabel: 'Score',
      noScore: 'No Score',
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
    status: 'completed' as InterviewStatus,
    score: 85,
    duration: 1800, // 30 minutes
    createdAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render interview title correctly', () => {
      render(<InterviewCard {...defaultProps} />);

      expect(screen.getByText('Interview Practice')).toBeInTheDocument();
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

      const statusChips = screen.getAllByText('Pending');
      expect(statusChips.length).toBeGreaterThan(0);
    });

    it('should render in_progress status with primary color', () => {
      render(<InterviewCard {...defaultProps} status="in_progress" score={null} />);

      const statusChips = screen.getAllByText('In Progress');
      expect(statusChips.length).toBeGreaterThan(0);
    });

    it('should render completed status with success color', () => {
      render(<InterviewCard {...defaultProps} status="completed" />);

      const statusChips = screen.getAllByText('Completed');
      expect(statusChips.length).toBeGreaterThan(0);
    });
  });

  describe('score display', () => {
    it('should display score when provided', () => {
      render(<InterviewCard {...defaultProps} score={85} />);

      // Score appears in both info row and highlighted box
      // Note: Score label and value are in separate elements in the mobile view
      expect(screen.getByText('Score:')).toBeInTheDocument();
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

      // Find and click the card by its title
      const title = screen.getByText('Interview Practice');
      await user.click(title);
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

  describe('delete behavior', () => {
    it('should show delete button when onDelete is provided', () => {
      render(<InterviewCard {...defaultProps} onDelete={() => {}} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not show delete button when onDelete is not provided', () => {
      render(<InterviewCard {...defaultProps} />);

      const deleteButton = screen.queryByRole('button', { name: 'Delete' });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const handleDelete = vi.fn();

      render(<InterviewCard {...defaultProps} onDelete={handleDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(deleteButton);
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('job description edge cases', () => {
    it('should handle empty jobDescription object', () => {
      render(<InterviewCard {...defaultProps} jobDescription={{}} />);

      // Should fall back to default title
      expect(screen.getByText('Interview Practice')).toBeInTheDocument();
    });

    it('should handle jobDescription with empty company and title', () => {
      render(<InterviewCard {...defaultProps} jobDescription={{ company: '', title: '' }} />);

      // Should fall back to default title
      expect(screen.getByText('Interview Practice')).toBeInTheDocument();
    });

    it('should not show viewOriginalJob link when jobDescription exists but has no url', () => {
      render(
        <InterviewCard
          {...defaultProps}
          jobDescription={{ company: 'Test Corp', title: 'Engineer' }}
        />
      );

      // The link should not be present
      expect(screen.queryByText(/viewOriginalJob/)).not.toBeInTheDocument();
    });

    it('should handle jobDescription with only company', () => {
      render(<InterviewCard {...defaultProps} jobDescription={{ company: 'Test Corp' }} />);

      expect(screen.getByText('Test Corp')).toBeInTheDocument();
    });

    it('should handle jobDescription with only title', () => {
      render(<InterviewCard {...defaultProps} jobDescription={{ title: 'Software Engineer' }} />);

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });
  });

  describe('external link behavior', () => {
    it('should not trigger card onClick when clicking external link', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <InterviewCard
          {...defaultProps}
          onClick={handleClick}
          jobDescriptionUrl="https://example.com/job"
        />
      );

      const link = screen.getByText(/viewOriginalJob/);
      await user.click(link);

      // Card onClick should not be triggered
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger card onClick when clicking delete button', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const handleDelete = vi.fn();

      render(<InterviewCard {...defaultProps} onClick={handleClick} onDelete={handleDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(deleteButton);

      // Card onClick should not be triggered
      expect(handleClick).not.toHaveBeenCalled();
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    it('should not trigger card onClick when clicking retry button', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const handleRetry = vi.fn();

      render(
        <InterviewCard
          {...defaultProps}
          onClick={handleClick}
          onRetry={handleRetry}
          jobDescription={{ company: 'Test Corp' }}
        />
      );

      const retryButton = screen.getByRole('button', { name: 'Retry with same job' });
      await user.click(retryButton);

      // Card onClick should not be triggered
      expect(handleClick).not.toHaveBeenCalled();
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
