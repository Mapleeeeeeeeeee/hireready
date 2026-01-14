import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlBar } from '@/components/interview/ControlBar';

const defaultLabels = {
  muteMic: 'Mute Microphone',
  unmuteMic: 'Unmute Microphone',
  turnOffCamera: 'Turn Off Camera',
  turnOnCamera: 'Turn On Camera',
  endCall: 'End Interview',
  caption: 'AI Captions',
};

const defaultProps = {
  isMicOn: true,
  isVideoOn: true,
  onToggleMic: vi.fn(),
  onToggleVideo: vi.fn(),
  onEndCall: vi.fn(),
  isCaptionOn: false,
  onToggleCaption: vi.fn(),
  labels: defaultLabels,
};

describe('ControlBar', () => {
  describe('when rendering control buttons', () => {
    it('should display all control buttons', () => {
      render(<ControlBar {...defaultProps} />);

      expect(screen.getByLabelText('Mute Microphone')).toBeInTheDocument();
      expect(screen.getByLabelText('Turn Off Camera')).toBeInTheDocument();
      expect(screen.getByLabelText('AI Captions')).toBeInTheDocument();
    });
  });

  describe('when mic state changes', () => {
    it.each([
      { isMicOn: true, expectedLabel: 'Mute Microphone' },
      { isMicOn: false, expectedLabel: 'Unmute Microphone' },
    ])('should show "$expectedLabel" when isMicOn is $isMicOn', ({ isMicOn, expectedLabel }) => {
      render(<ControlBar {...defaultProps} isMicOn={isMicOn} />);

      expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('when video state changes', () => {
    it.each([
      { isVideoOn: true, expectedLabel: 'Turn Off Camera' },
      { isVideoOn: false, expectedLabel: 'Turn On Camera' },
    ])(
      'should show "$expectedLabel" when isVideoOn is $isVideoOn',
      ({ isVideoOn, expectedLabel }) => {
        render(<ControlBar {...defaultProps} isVideoOn={isVideoOn} />);

        expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
      }
    );
  });

  describe('when caption state changes', () => {
    it('should show caption button with aria-pressed=false when off', () => {
      render(<ControlBar {...defaultProps} isCaptionOn={false} />);

      expect(screen.getByLabelText('AI Captions')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show caption button with aria-pressed=true when on', () => {
      render(<ControlBar {...defaultProps} isCaptionOn={true} />);

      expect(screen.getByLabelText('AI Captions')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('when user interacts with buttons', () => {
    it('should call onToggleMic when mic button is clicked', () => {
      const mockToggleMic = vi.fn();

      render(<ControlBar {...defaultProps} onToggleMic={mockToggleMic} />);

      fireEvent.click(screen.getByLabelText('Mute Microphone'));
      expect(mockToggleMic).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleVideo when video button is clicked', () => {
      const mockToggleVideo = vi.fn();

      render(<ControlBar {...defaultProps} isVideoOn={false} onToggleVideo={mockToggleVideo} />);

      fireEvent.click(screen.getByLabelText('Turn On Camera'));
      expect(mockToggleVideo).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleCaption when caption button is clicked', () => {
      const mockToggleCaption = vi.fn();

      render(<ControlBar {...defaultProps} onToggleCaption={mockToggleCaption} />);

      fireEvent.click(screen.getByLabelText('AI Captions'));
      expect(mockToggleCaption).toHaveBeenCalledTimes(1);
    });

    it('should call onEndCall when end button is clicked', () => {
      const mockEndCall = vi.fn();

      render(<ControlBar {...defaultProps} onEndCall={mockEndCall} />);

      const buttons = screen.getAllByRole('button');
      const endButton = buttons[buttons.length - 1];
      fireEvent.click(endButton);

      expect(mockEndCall).toHaveBeenCalledTimes(1);
    });
  });
});
