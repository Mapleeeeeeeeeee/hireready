import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaptionButton } from '@/components/interview/CaptionButton';

describe('CaptionButton', () => {
  describe('when rendering', () => {
    it('should render caption button with correct aria-label', () => {
      render(<CaptionButton isOn={false} onToggle={vi.fn()} label="AI Captions" />);

      expect(screen.getByLabelText('AI Captions')).toBeInTheDocument();
    });

    it('should have aria-pressed=false when off', () => {
      render(<CaptionButton isOn={false} onToggle={vi.fn()} label="AI Captions" />);

      expect(screen.getByLabelText('AI Captions')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-pressed=true when on', () => {
      render(<CaptionButton isOn={true} onToggle={vi.fn()} label="AI Captions" />);

      expect(screen.getByLabelText('AI Captions')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('when clicking the button', () => {
    it('should call onToggle when clicked', () => {
      const mockOnToggle = vi.fn();

      render(<CaptionButton isOn={false} onToggle={mockOnToggle} label="AI Captions" />);

      fireEvent.click(screen.getByLabelText('AI Captions'));

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('when showing active state', () => {
    it('should show inactive styling when off', () => {
      render(<CaptionButton isOn={false} onToggle={vi.fn()} label="AI Captions" />);

      const button = screen.getByLabelText('AI Captions');
      expect(button).toHaveClass('bg-transparent');
    });

    it('should show active styling when on', () => {
      render(<CaptionButton isOn={true} onToggle={vi.fn()} label="AI Captions" />);

      const button = screen.getByLabelText('AI Captions');
      expect(button).toHaveClass('bg-soft-clay/50');
    });
  });
});
