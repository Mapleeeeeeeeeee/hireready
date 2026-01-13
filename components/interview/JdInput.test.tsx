import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JdInput } from '@/components/interview/JdInput';
import type { JobDescription } from '@/lib/jd/types';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      inputMode: 'Input Mode',
      urlTab: 'From URL',
      textTab: 'Manual Input',
      urlDescription: 'Paste job posting URL',
      urlPlaceholder: 'https://www.104.com.tw/job/...',
      parse: 'Parse',
      parsing: 'Parsing...',
      supportedSites: 'Supported sites',
      textDescription: 'Enter job details manually',
      jobTitle: 'Job Title',
      jobTitlePlaceholder: 'e.g., Frontend Engineer',
      company: 'Company',
      companyPlaceholder: 'e.g., Google',
      description: 'Job Description',
      descriptionPlaceholder: 'Paste job description here...',
      confirm: 'Confirm',
      unknownCompany: 'Unknown Company',
      'errors.urlRequired': 'URL is required',
      'errors.unsupportedUrl': 'Unsupported URL',
      'errors.titleRequired': 'Job title is required',
      'errors.descriptionRequired': 'Job description is required',
      'errors.parseFailed': 'Failed to parse job posting',
    };
    return translations[key] || key;
  },
}));

// Mock api-client
vi.mock('@/lib/utils/api-client', () => ({
  apiPost: vi.fn(),
}));

import { apiPost } from '@/lib/utils/api-client';

const mockApiPost = vi.mocked(apiPost);

describe('JdInput', () => {
  const mockOnParsed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tabs rendering', () => {
    it('should render URL and Text tabs', () => {
      render(<JdInput onParsed={mockOnParsed} />);
      expect(screen.getByText('From URL')).toBeInTheDocument();
      expect(screen.getByText('Manual Input')).toBeInTheDocument();
    });

    it('should show URL tab content by default', () => {
      render(<JdInput onParsed={mockOnParsed} />);
      expect(screen.getByText('Paste job posting URL')).toBeInTheDocument();
      expect(screen.getByText('Supported sites:')).toBeInTheDocument();
    });

    it('should switch to text tab when clicked', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      await user.click(screen.getByText('Manual Input'));

      expect(screen.getByText('Enter job details manually')).toBeInTheDocument();
      expect(screen.getByText('Job Title')).toBeInTheDocument();
    });
  });

  describe('URL mode', () => {
    it('should disable parse button when URL is empty', async () => {
      render(<JdInput onParsed={mockOnParsed} />);

      // Parse button should be disabled when URL is empty
      const parseButton = screen.getByRole('button', { name: /parse/i });
      expect(parseButton).toBeDisabled();
    });

    it('should show error for unsupported URL', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://unsupported-site.com/job/123');

      const parseButton = screen.getByRole('button', { name: /parse/i });
      await user.click(parseButton);

      expect(screen.getByText('Unsupported URL')).toBeInTheDocument();
    });

    it('should show supported domains badges', () => {
      render(<JdInput onParsed={mockOnParsed} />);
      expect(screen.getByText('104.com.tw')).toBeInTheDocument();
      expect(screen.getByText('1111.com.tw')).toBeInTheDocument();
    });

    it('should call API and onParsed when valid URL is submitted', async () => {
      const user = userEvent.setup();
      const mockJobDescription: JobDescription = {
        source: '104',
        title: 'Frontend Engineer',
        company: 'Test Company',
        description: 'Job description here',
        fetchedAt: new Date(),
      };

      mockApiPost.mockResolvedValueOnce({ jobDescription: mockJobDescription });

      render(<JdInput onParsed={mockOnParsed} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://www.104.com.tw/job/abc123');

      const parseButton = screen.getByRole('button', { name: /parse/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/api/jd/parse', {
          type: 'url',
          content: 'https://www.104.com.tw/job/abc123',
        });
        expect(mockOnParsed).toHaveBeenCalledWith(mockJobDescription);
      });
    });

    it('should show error when API call fails', async () => {
      const user = userEvent.setup();
      mockApiPost.mockRejectedValueOnce(new Error('Network error'));

      render(<JdInput onParsed={mockOnParsed} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://www.104.com.tw/job/abc123');

      const parseButton = screen.getByRole('button', { name: /parse/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should submit on Enter key press', async () => {
      const user = userEvent.setup();
      const mockJobDescription: JobDescription = {
        source: '104',
        title: 'Engineer',
        company: 'Company',
        description: 'Description',
        fetchedAt: new Date(),
      };
      mockApiPost.mockResolvedValueOnce({ jobDescription: mockJobDescription });

      render(<JdInput onParsed={mockOnParsed} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://www.104.com.tw/job/123{Enter}');

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalled();
      });
    });
  });

  describe('text mode (manual input)', () => {
    it('should disable confirm button when job title is empty', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      // Switch to text tab
      await user.click(screen.getByText('Manual Input'));

      // Fill only description (title is empty)
      const descriptionInput = screen.getByPlaceholderText('Paste job description here...');
      await user.type(descriptionInput, 'Job description');

      // Confirm button should be disabled when title is empty
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when description is empty', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      // Switch to text tab
      await user.click(screen.getByText('Manual Input'));

      // Fill only title (description is empty)
      const titleInput = screen.getByPlaceholderText('e.g., Frontend Engineer');
      await user.type(titleInput, 'Frontend Engineer');

      // Confirm button should be disabled when description is empty
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should call onParsed with manual job description', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      // Switch to text tab
      await user.click(screen.getByText('Manual Input'));

      // Fill all fields
      const titleInput = screen.getByPlaceholderText('e.g., Frontend Engineer');
      await user.type(titleInput, 'Frontend Engineer');

      const companyInput = screen.getByPlaceholderText('e.g., Google');
      await user.type(companyInput, 'Test Company');

      const descriptionInput = screen.getByPlaceholderText('Paste job description here...');
      await user.type(descriptionInput, 'Job responsibilities and requirements');

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnParsed).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'manual',
            title: 'Frontend Engineer',
            company: 'Test Company',
            description: 'Job responsibilities and requirements',
          })
        );
      });
    });

    it('should use default company name when not provided', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      // Switch to text tab
      await user.click(screen.getByText('Manual Input'));

      // Fill only required fields
      const titleInput = screen.getByPlaceholderText('e.g., Frontend Engineer');
      await user.type(titleInput, 'Test Job');

      const descriptionInput = screen.getByPlaceholderText('Paste job description here...');
      await user.type(descriptionInput, 'Test description');

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnParsed).toHaveBeenCalledWith(
          expect.objectContaining({
            company: 'Unknown Company',
          })
        );
      });
    });
  });

  describe('loading state', () => {
    it('should disable inputs when external loading is true', () => {
      render(<JdInput onParsed={mockOnParsed} isLoading={true} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      expect(urlInput).toBeDisabled();
    });

    it('should show parsing text when loading', async () => {
      const user = userEvent.setup();
      // Make API call hang
      mockApiPost.mockImplementation(() => new Promise(() => {}));

      render(<JdInput onParsed={mockOnParsed} />);

      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://www.104.com.tw/job/abc123');

      const parseButton = screen.getByRole('button', { name: /parse/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Parsing...')).toBeInTheDocument();
      });
    });
  });

  describe('error clearing', () => {
    it('should clear error when switching tabs', async () => {
      const user = userEvent.setup();
      render(<JdInput onParsed={mockOnParsed} />);

      // Enter an unsupported URL to enable the button, then trigger error
      const urlInput = screen.getByPlaceholderText('https://www.104.com.tw/job/...');
      await user.type(urlInput, 'https://unsupported-site.com/job/123');

      const parseButton = screen.getByRole('button', { name: /parse/i });
      await user.click(parseButton);
      expect(screen.getByText('Unsupported URL')).toBeInTheDocument();

      // Switch tabs
      await user.click(screen.getByText('Manual Input'));

      // Error should be cleared
      expect(screen.queryByText('Unsupported URL')).not.toBeInTheDocument();
    });
  });
});
