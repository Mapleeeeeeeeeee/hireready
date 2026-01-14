import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JdPreview } from '@/components/interview/JdPreview';
import type { JobDescription } from '@/lib/jd/types';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      viewOriginal: 'View original',
      clear: 'Clear',
      company: 'Company',
      location: 'Location',
      salary: 'Salary',
      descriptionLabel: 'Description',
      requirementsLabel: 'Requirements',
      moreRequirements: 'more',
      jdReady: 'Job description ready',
      'sources.manual': 'Manual',
      // SourceBadge component uses t('manual') directly
      manual: 'Manual',
    };
    return translations[key] || key;
  },
}));

const createMockJobDescription = (overrides?: Partial<JobDescription>): JobDescription => ({
  source: '104',
  title: 'Frontend Engineer',
  company: 'Test Company',
  description: 'This is a job description for a frontend engineer position.',
  fetchedAt: new Date(),
  ...overrides,
});

describe('JdPreview', () => {
  const mockOnClear = vi.fn();

  describe('basic rendering', () => {
    it('should render job title', () => {
      const jd = createMockJobDescription();
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });

    it('should render company name', () => {
      const jd = createMockJobDescription();
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    it('should render job description', () => {
      const jd = createMockJobDescription();
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(
        screen.getByText('This is a job description for a frontend engineer position.')
      ).toBeInTheDocument();
    });

    it('should render success indicator', () => {
      const jd = createMockJobDescription();
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText('Job description ready')).toBeInTheDocument();
    });
  });

  describe('source badge', () => {
    it.each([
      { source: '104' as const, expectedLabel: '104' },
      { source: '1111' as const, expectedLabel: '1111' },
      { source: 'manual' as const, expectedLabel: 'Manual' },
    ])('should display $expectedLabel badge for $source source', ({ source, expectedLabel }) => {
      const jd = createMockJobDescription({ source });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('optional fields', () => {
    it('should render location when provided', () => {
      const jd = createMockJobDescription({ location: 'Taipei, Taiwan' });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText('Taipei, Taiwan')).toBeInTheDocument();
    });

    it('should not render location row when not provided', () => {
      const jd = createMockJobDescription({ location: undefined });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.queryByText('Location:')).not.toBeInTheDocument();
    });

    it('should render salary when provided', () => {
      const jd = createMockJobDescription({ salary: '$80,000 - $120,000' });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.getByText('$80,000 - $120,000')).toBeInTheDocument();
    });

    it('should not render salary row when not provided', () => {
      const jd = createMockJobDescription({ salary: undefined });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.queryByText('Salary:')).not.toBeInTheDocument();
    });
  });

  describe('requirements', () => {
    it('should render requirements when provided', () => {
      const jd = createMockJobDescription({
        requirements: ['React experience', 'TypeScript skills', 'Team player'],
      });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      expect(screen.getByText('React experience')).toBeInTheDocument();
      expect(screen.getByText('TypeScript skills')).toBeInTheDocument();
      expect(screen.getByText('Team player')).toBeInTheDocument();
    });

    it('should not render requirements section when empty', () => {
      const jd = createMockJobDescription({ requirements: [] });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.queryByText('Requirements')).not.toBeInTheDocument();
    });

    it('should limit displayed requirements to 5', () => {
      const jd = createMockJobDescription({
        requirements: ['Req 1', 'Req 2', 'Req 3', 'Req 4', 'Req 5', 'Req 6', 'Req 7'],
      });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      expect(screen.getByText('Req 1')).toBeInTheDocument();
      expect(screen.getByText('Req 5')).toBeInTheDocument();
      expect(screen.queryByText('Req 6')).not.toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('external URL link', () => {
    it('should render view original link when URL is provided', () => {
      const jd = createMockJobDescription({ url: 'https://www.104.com.tw/job/abc123' });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      const link = screen.getByText('View original');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', 'https://www.104.com.tw/job/abc123');
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
      expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not render view original link when URL is not provided', () => {
      const jd = createMockJobDescription({ url: undefined });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);
      expect(screen.queryByText('View original')).not.toBeInTheDocument();
    });
  });

  describe('description truncation', () => {
    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(250);
      const jd = createMockJobDescription({ description: longDescription });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      const truncated = 'A'.repeat(200) + '...';
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('should not truncate short descriptions', () => {
      const shortDescription = 'Short description';
      const jd = createMockJobDescription({ description: shortDescription });
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      expect(screen.getByText('Short description')).toBeInTheDocument();
      expect(screen.queryByText(/\.\.\.$/)).not.toBeInTheDocument();
    });
  });

  describe('clear functionality', () => {
    it('should call onClear when clear button is clicked', async () => {
      const user = userEvent.setup();
      const jd = createMockJobDescription();
      render(<JdPreview jobDescription={jd} onClear={mockOnClear} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });
  });
});
