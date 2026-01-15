import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

describe('LanguageToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render both language buttons', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      expect(screen.getByRole('button', { name: /switch to english/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /切換至中文/i })).toBeInTheDocument();
    });

    it('should render EN and 中 labels', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('中')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      const { container } = render(<LanguageToggle className="custom-class" />);

      // The ButtonGroup should have the custom class
      const buttonGroup = container.querySelector('.custom-class');
      expect(buttonGroup).toBeInTheDocument();
    });
  });

  describe('current locale display', () => {
    it('should show EN button as active when locale is en', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      const enButton = screen.getByRole('button', { name: /switch to english/i });
      const zhButton = screen.getByRole('button', { name: /切換至中文/i });

      // EN button should have solid variant styling (bg-terracotta)
      expect(enButton.className).toContain('bg-terracotta');
      expect(enButton.className).toContain('text-white');

      // ZH button should have flat variant styling
      expect(zhButton.className).not.toContain('text-white');
    });

    it('should show 中 button as active when locale is zh-TW', () => {
      mockPathname.mockReturnValue('/zh-TW/dashboard');

      render(<LanguageToggle />);

      const enButton = screen.getByRole('button', { name: /switch to english/i });
      const zhButton = screen.getByRole('button', { name: /切換至中文/i });

      // ZH button should have solid variant styling (bg-terracotta)
      expect(zhButton.className).toContain('bg-terracotta');
      expect(zhButton.className).toContain('text-white');

      // EN button should have flat variant styling
      expect(enButton.className).not.toContain('text-white');
    });

    it('should default to zh-TW when locale cannot be extracted', () => {
      mockPathname.mockReturnValue('/');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });

      // ZH button should be active by default
      expect(zhButton.className).toContain('bg-terracotta');
    });
  });

  describe('language switching', () => {
    it('should call router.push with correct path when switching from en to zh-TW', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });
      await user.click(zhButton);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/zh-TW/dashboard');
    });

    it('should call router.push with correct path when switching from zh-TW to en', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/zh-TW/dashboard');

      render(<LanguageToggle />);

      const enButton = screen.getByRole('button', { name: /switch to english/i });
      await user.click(enButton);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });

    it('should handle nested paths correctly', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/en/interview/setup');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });
      await user.click(zhButton);

      expect(mockPush).toHaveBeenCalledWith('/zh-TW/interview/setup');
    });
  });

  describe('clicking current language', () => {
    it('should not trigger router.push when clicking already selected EN', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      const enButton = screen.getByRole('button', { name: /switch to english/i });
      await user.click(enButton);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not trigger router.push when clicking already selected zh-TW', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/zh-TW/dashboard');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });
      await user.click(zhButton);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have appropriate aria-labels for both buttons', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      expect(screen.getByLabelText('Switch to English')).toBeInTheDocument();
      expect(screen.getByLabelText('切換至中文')).toBeInTheDocument();
    });

    it('should have buttons with role="button"', () => {
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle path with query parameters', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/en/dashboard');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });
      await user.click(zhButton);

      // The pathname doesn't include query params, so this should work correctly
      expect(mockPush).toHaveBeenCalledWith('/zh-TW/dashboard');
    });

    it('should handle root locale path', async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue('/en');

      render(<LanguageToggle />);

      const zhButton = screen.getByRole('button', { name: /切換至中文/i });
      await user.click(zhButton);

      expect(mockPush).toHaveBeenCalledWith('/zh-TW');
    });
  });
});
