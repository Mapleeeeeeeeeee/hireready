import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AudioPlayer } from './AudioPlayer';

// ============================================================
// Mock Setup
// ============================================================

const messages = {
  history: {
    audio: {
      play: 'Play',
      pause: 'Pause',
      loading: 'Loading...',
      error: 'Failed to load audio',
    },
  },
};

// ============================================================
// Test Helpers
// ============================================================

function renderAudioPlayer(src = '/test-audio.mp3') {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AudioPlayer src={src} />
    </NextIntlClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('AudioPlayer', () => {
  // ============================================================
  // Render Tests
  // ============================================================

  describe('Rendering', () => {
    it('renders the audio player with play button', () => {
      renderAudioPlayer();

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      renderAudioPlayer();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      renderAudioPlayer();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('has audio element with correct source', () => {
      const { container } = renderAudioPlayer('/custom-audio.mp3');

      const audio = container.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', '/custom-audio.mp3');
    });
  });

  // ============================================================
  // i18n Tests
  // ============================================================

  describe('Internationalization', () => {
    it('uses translated text for play button', () => {
      renderAudioPlayer();

      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('uses translated text for loading state', () => {
      renderAudioPlayer();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Accessibility Tests
  // ============================================================

  describe('Accessibility', () => {
    it('has proper ARIA labels on play button', () => {
      renderAudioPlayer();

      const button = screen.getByRole('button', { name: /play/i });
      expect(button).toHaveAccessibleName();
    });

    it('has region role for audio player', () => {
      renderAudioPlayer();

      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
    });

    it('has proper ARIA label on progress bar', () => {
      renderAudioPlayer();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAccessibleName();
    });

    it('disables button when audio is loading', () => {
      renderAudioPlayer();

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeDisabled();
    });
  });

  // ============================================================
  // Custom Props Tests
  // ============================================================

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <AudioPlayer src="/test.mp3" className="custom-class" />
        </NextIntlClientProvider>
      );

      const player = container.querySelector('.custom-class');
      expect(player).toBeInTheDocument();
    });

    it('uses provided audio source', () => {
      const { container } = renderAudioPlayer('/custom-audio.mp3');

      const audio = container.querySelector('audio');
      expect(audio).toHaveAttribute('src', '/custom-audio.mp3');
    });
  });
});
