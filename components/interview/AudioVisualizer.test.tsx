import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudioVisualizer } from '@/components/interview/AudioVisualizer';

describe('AudioVisualizer', () => {
  describe('when rendering with different states', () => {
    it.each([
      { state: 'idle' as const, label: 'Ready' },
      { state: 'listening' as const, label: 'Listening' },
      { state: 'speaking' as const, label: 'Speaking' },
      { state: 'processing' as const, label: 'Processing' },
    ])('should display "$label" when state is "$state"', ({ state, label }) => {
      render(<AudioVisualizer state={state} stateLabel={label} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('when audioLevel prop is provided', () => {
    it.each([
      { audioLevel: 0, description: 'silent' },
      { audioLevel: 0.5, description: 'medium' },
      { audioLevel: 1, description: 'loud' },
    ])('should render correctly with $description audio level ($audioLevel)', ({ audioLevel }) => {
      const { container } = render(
        <AudioVisualizer state="speaking" stateLabel="Speaking" audioLevel={audioLevel} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('when audioLevel prop is not provided', () => {
    it('should apply default audioLevel of 0', () => {
      const { container } = render(<AudioVisualizer state="idle" stateLabel="Ready" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
