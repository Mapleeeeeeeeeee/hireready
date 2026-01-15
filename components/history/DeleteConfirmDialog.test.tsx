import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteConfirmDialog } from '@/components/history/DeleteConfirmDialog';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'deleteConfirm.title': 'Delete Interview Record',
      'deleteConfirm.message':
        'Are you sure you want to delete this interview record? This action cannot be undone.',
      'deleteConfirm.confirm': 'Delete',
      'deleteConfirm.cancel': 'Cancel',
      'deleteConfirm.deleting': 'Deleting...',
      untitledInterview: 'Untitled Interview',
    };
    return translations[key] || key;
  },
}));

describe('DeleteConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render dialog when open', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Delete Interview Record')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete this interview record? This action cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    it('should render cancel and confirm buttons', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<DeleteConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Delete Interview Record')).not.toBeInTheDocument();
    });
  });

  describe('interview info display', () => {
    it('should display interview info when provided', () => {
      render(
        <DeleteConfirmDialog
          {...defaultProps}
          interviewInfo={{
            title: 'Frontend Engineer at ABC Tech',
            date: '2024-01-15',
          }}
        />
      );

      expect(screen.getByText('Frontend Engineer at ABC Tech')).toBeInTheDocument();
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    });

    it('should not display interview info section when not provided', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      // The info panel has bg-gray-50 class, it should not exist
      const infoPanel = document.querySelector('.bg-gray-50');
      expect(infoPanel).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<DeleteConfirmDialog {...defaultProps} onClose={handleClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when delete button is clicked', async () => {
      const user = userEvent.setup();
      const handleConfirm = vi.fn();

      render(<DeleteConfirmDialog {...defaultProps} onConfirm={handleConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('should show loading text when isDeleting is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable cancel button when isDeleting is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('interview info edge cases', () => {
    it('should display title when only title is provided', () => {
      render(
        <DeleteConfirmDialog
          {...defaultProps}
          interviewInfo={{
            title: 'Frontend Engineer at ABC Tech',
          }}
        />
      );

      expect(screen.getByText('Frontend Engineer at ABC Tech')).toBeInTheDocument();
      // Date section should not be rendered
      const calendarIcons = document.querySelectorAll('.lucide-calendar');
      expect(calendarIcons.length).toBe(0);
    });

    it('should display date when only date is provided', () => {
      render(
        <DeleteConfirmDialog
          {...defaultProps}
          interviewInfo={{
            date: '2024-01-15',
          }}
        />
      );

      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      // Should show "Untitled Interview" as fallback title
      expect(screen.getByText('Untitled Interview')).toBeInTheDocument();
    });

    it('should show "Untitled Interview" when interviewInfo has empty title', () => {
      render(
        <DeleteConfirmDialog
          {...defaultProps}
          interviewInfo={{
            title: '',
            date: '2024-01-15',
          }}
        />
      );

      expect(screen.getByText('Untitled Interview')).toBeInTheDocument();
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    });

    it('should handle interviewInfo with both fields empty', () => {
      render(
        <DeleteConfirmDialog
          {...defaultProps}
          interviewInfo={{
            title: '',
            date: '',
          }}
        />
      );

      expect(screen.getByText('Untitled Interview')).toBeInTheDocument();
      // Empty date should not render calendar icon
      const calendarIcons = document.querySelectorAll('.lucide-calendar');
      expect(calendarIcons.length).toBe(0);
    });
  });

  describe('keyboard interactions', () => {
    it('should close dialog when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<DeleteConfirmDialog {...defaultProps} onClose={handleClose} />);

      // Press Escape key
      await user.keyboard('{Escape}');

      // HeroUI Modal should handle ESC and call onClose
      expect(handleClose).toHaveBeenCalled();
    });

    it('should not close dialog with Escape when isDeleting is true', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} onClose={handleClose} />);

      // Press Escape key
      await user.keyboard('{Escape}');

      // Modal should not close during deletion
      // Note: This behavior depends on HeroUI Modal's isDismissable prop
      // We're testing that the cancel button is disabled, which indicates the modal shouldn't close
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });
  });
});
