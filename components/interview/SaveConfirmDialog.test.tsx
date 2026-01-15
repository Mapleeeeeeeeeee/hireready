/**
 * SaveConfirmDialog Component Tests
 * Tests the interview save confirmation dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { SaveConfirmDialog } from './SaveConfirmDialog';

// ============================================================
// Mock Messages
// ============================================================

const messages = {
  interview: {
    saveDialog: {
      title: 'Save Interview Record',
      duration: 'Interview Duration',
      transcriptCount: 'Conversation Count',
      jobDescription: 'Job Description',
      analysisNotice:
        'AI will analyze your answers and generate model responses (takes 10-20 seconds)',
      save: 'Save',
      discard: 'Discard',
      savingNotice: 'AI is generating analysis and model responses...',
      errorTitle: 'Save Failed',
      errorRetry: 'Please try again or contact support.',
      errorOccurred: 'An error occurred',
    },
  },
};

// ============================================================
// Test Wrapper
// ============================================================

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('SaveConfirmDialog', () => {
  const mockOnSave = vi.fn();
  const mockOnDiscard = vi.fn();

  const defaultProps = {
    isOpen: true,
    onSave: mockOnSave,
    onDiscard: mockOnDiscard,
    duration: 150, // 2:30
    transcriptCount: 10,
    isSaving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Save Interview Record')).toBeInTheDocument();
      expect(screen.getByText('Interview Duration')).toBeInTheDocument();
      expect(screen.getByText('Conversation Count')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Save Interview Record')).not.toBeInTheDocument();
    });

    it('should display formatted duration', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={150} />);

      expect(screen.getByText('02:30')).toBeInTheDocument();
    });

    it('should display transcript count', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} transcriptCount={10} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display job description URL when provided', () => {
      renderWithIntl(
        <SaveConfirmDialog {...defaultProps} jobDescriptionUrl="https://example.com/job" />
      );

      expect(screen.getByText('Job Description')).toBeInTheDocument();
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/job');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not display job description section when URL not provided', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.queryByText('Job Description')).not.toBeInTheDocument();
    });

    it('should display analysis notice when not saving', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isSaving={false} />);

      expect(
        screen.getByText(/AI will analyze your answers and generate model responses/)
      ).toBeInTheDocument();
    });

    it('should display saving notice when saving', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isSaving={true} />);

      expect(screen.getByText(/AI is generating analysis and model responses/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSave when Save button clicked', async () => {
      const user = userEvent.setup();
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('should call onDiscard when Discard button clicked', async () => {
      const user = userEvent.setup();
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      const discardButton = screen.getByRole('button', { name: 'Discard' });
      await user.click(discardButton);

      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('should disable buttons when saving', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isSaving={true} />);

      const discardButton = screen.getByRole('button', { name: 'Discard' });
      expect(discardButton).toBeDisabled();
    });

    it('should show loading state on Save button when saving', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isSaving={true} />);

      // When loading, the button name becomes "Loading Save"
      const saveButton = screen.getByRole('button', { name: 'Loading Save' });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Duration Formatting', () => {
    it('should format single-digit minutes and seconds with leading zeros', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={65} />);

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('should format double-digit minutes and seconds correctly', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={665} />);

      expect(screen.getByText('11:05')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={0} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should handle exactly one minute', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={60} />);

      expect(screen.getByText('01:00')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
    });

    it('should not be dismissable when saving', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} isSaving={true} />);

      // Modal should not have close button when saving
      // This is implementation specific to HeroUI, so we just verify the prop is passed
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', async () => {
      renderWithIntl(
        <SaveConfirmDialog {...defaultProps} errorMessage="Network connection failed" />
      );

      expect(screen.getByText('Save Failed')).toBeInTheDocument();
      expect(screen.getByText('Save Failed')).toBeInTheDocument();
      // Error details should be hidden initially
      expect(screen.queryByText('Network connection failed')).not.toBeInTheDocument();
      expect(screen.getByText('Please try again or contact support.')).toBeInTheDocument();

      // Click to expand
      const errorHeader = screen.getByText('Save Failed').closest('div');
      await userEvent.click(errorHeader!);

      // Now error details should be visible
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });

    it('should not display error section when errorMessage is not provided', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.queryByText('Save Failed')).not.toBeInTheDocument();
    });

    it('should not display error section when errorMessage is empty string', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} errorMessage="" />);

      expect(screen.queryByText('Save Failed')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative duration gracefully', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={-10} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should handle zero transcript count', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} transcriptCount={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle extremely long job description URL', () => {
      const longUrl = 'https://example.com/job/' + 'a'.repeat(300);
      renderWithIntl(<SaveConfirmDialog {...defaultProps} jobDescriptionUrl={longUrl} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', longUrl);
    });

    it('should handle very large duration (hours)', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} duration={7200} />);

      expect(screen.getByText('120:00')).toBeInTheDocument(); // 2 hours
    });

    it('should handle very large transcript count', () => {
      renderWithIntl(<SaveConfirmDialog {...defaultProps} transcriptCount={9999} />);

      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    it('should handle both error message and saving state', () => {
      renderWithIntl(
        <SaveConfirmDialog {...defaultProps} errorMessage="Previous error" isSaving={true} />
      );

      expect(screen.getByText('Save Failed')).toBeInTheDocument();
      expect(screen.queryByText('Previous error')).not.toBeInTheDocument();
      expect(screen.getByText(/AI is generating analysis/)).toBeInTheDocument();
    });
  });
});
