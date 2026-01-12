import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlBar } from '@/components/interview/ControlBar';

const defaultLabels = {
  muteMic: 'Mute Microphone',
  unmuteMic: 'Unmute Microphone',
  turnOffCamera: 'Turn Off Camera',
  turnOnCamera: 'Turn On Camera',
  endCall: 'End Interview',
};

describe('ControlBar', () => {
  describe('when rendering control buttons', () => {
    it('should display all control buttons', () => {
      render(
        <ControlBar
          isMicOn={true}
          isVideoOn={true}
          onToggleMic={vi.fn()}
          onToggleVideo={vi.fn()}
          onEndCall={vi.fn()}
          labels={defaultLabels}
        />
      );

      expect(screen.getByLabelText('Mute Microphone')).toBeInTheDocument();
      expect(screen.getByLabelText('Turn Off Camera')).toBeInTheDocument();
    });
  });

  describe('when mic state changes', () => {
    it.each([
      { isMicOn: true, expectedLabel: 'Mute Microphone' },
      { isMicOn: false, expectedLabel: 'Unmute Microphone' },
    ])('should show "$expectedLabel" when isMicOn is $isMicOn', ({ isMicOn, expectedLabel }) => {
      render(
        <ControlBar
          isMicOn={isMicOn}
          isVideoOn={true}
          onToggleMic={vi.fn()}
          onToggleVideo={vi.fn()}
          onEndCall={vi.fn()}
          labels={defaultLabels}
        />
      );

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
        render(
          <ControlBar
            isMicOn={true}
            isVideoOn={isVideoOn}
            onToggleMic={vi.fn()}
            onToggleVideo={vi.fn()}
            onEndCall={vi.fn()}
            labels={defaultLabels}
          />
        );

        expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
      }
    );
  });

  describe('when user interacts with buttons', () => {
    it('should call onToggleMic when mic button is clicked', () => {
      const mockToggleMic = vi.fn();

      render(
        <ControlBar
          isMicOn={true}
          isVideoOn={true}
          onToggleMic={mockToggleMic}
          onToggleVideo={vi.fn()}
          onEndCall={vi.fn()}
          labels={defaultLabels}
        />
      );

      fireEvent.click(screen.getByLabelText('Mute Microphone'));
      expect(mockToggleMic).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleVideo when video button is clicked', () => {
      const mockToggleVideo = vi.fn();

      render(
        <ControlBar
          isMicOn={true}
          isVideoOn={false}
          onToggleMic={vi.fn()}
          onToggleVideo={mockToggleVideo}
          onEndCall={vi.fn()}
          labels={defaultLabels}
        />
      );

      fireEvent.click(screen.getByLabelText('Turn On Camera'));
      expect(mockToggleVideo).toHaveBeenCalledTimes(1);
    });

    it('should call onEndCall when end button is clicked', () => {
      const mockEndCall = vi.fn();

      render(
        <ControlBar
          isMicOn={true}
          isVideoOn={true}
          onToggleMic={vi.fn()}
          onToggleVideo={vi.fn()}
          onEndCall={mockEndCall}
          labels={defaultLabels}
        />
      );

      const buttons = screen.getAllByRole('button');
      const endButton = buttons[buttons.length - 1];
      fireEvent.click(endButton);

      expect(mockEndCall).toHaveBeenCalledTimes(1);
    });
  });
});
