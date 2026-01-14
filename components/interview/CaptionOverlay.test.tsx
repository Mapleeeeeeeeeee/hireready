import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaptionOverlay } from '@/components/interview/CaptionOverlay';

describe('CaptionOverlay', () => {
  describe('when captions are off', () => {
    it('should not display any caption text', () => {
      render(<CaptionOverlay isOn={false} interimAiText="AI response" sessionState="speaking" />);

      expect(screen.queryByText('AI response')).not.toBeInTheDocument();
    });
  });

  describe('when captions are on', () => {
    it('should display AI caption when AI is speaking', async () => {
      render(
        <CaptionOverlay isOn={true} interimAiText="AI response here" sessionState="speaking" />
      );

      expect(await screen.findByText('AI response here')).toBeInTheDocument();
    });

    it('should not display caption when session is not speaking', () => {
      render(<CaptionOverlay isOn={true} interimAiText="AI response" sessionState="listening" />);

      expect(screen.queryByText('AI response')).not.toBeInTheDocument();
    });

    it('should not display caption when AI text is empty', () => {
      render(<CaptionOverlay isOn={true} interimAiText="" sessionState="speaking" />);

      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('should trim whitespace from AI text', () => {
      render(<CaptionOverlay isOn={true} interimAiText="   " sessionState="speaking" />);

      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('should not display caption when session is idle', () => {
      render(<CaptionOverlay isOn={true} interimAiText="AI text" sessionState="idle" />);

      expect(screen.queryByText('AI text')).not.toBeInTheDocument();
    });

    it('should not display caption when session is processing', () => {
      render(<CaptionOverlay isOn={true} interimAiText="AI text" sessionState="processing" />);

      expect(screen.queryByText('AI text')).not.toBeInTheDocument();
    });
  });
});
