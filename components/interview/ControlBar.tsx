'use client';

import { Button, Tooltip } from '@heroui/react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { CaptionButton } from './CaptionButton';

interface ControlBarProps {
  isMicOn: boolean;
  isVideoOn: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  isCaptionOn: boolean;
  onToggleCaption: () => void;
  labels: {
    muteMic: string;
    unmuteMic: string;
    turnOffCamera: string;
    turnOnCamera: string;
    endCall: string;
    caption: string;
  };
}

export function ControlBar({
  isMicOn,
  isVideoOn,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  isCaptionOn,
  onToggleCaption,
  labels,
}: ControlBarProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-warm-gray/20 flex items-center gap-6 rounded-2xl border bg-white/80 px-8 py-4 shadow-sm backdrop-blur-md"
    >
      <ControlIconButton
        isActive={isMicOn}
        onClick={onToggleMic}
        activeIcon={<Mic className="h-5 w-5" />}
        inactiveIcon={<MicOff className="h-5 w-5" />}
        label={isMicOn ? labels.muteMic : labels.unmuteMic}
      />

      <ControlIconButton
        isActive={isVideoOn}
        onClick={onToggleVideo}
        activeIcon={<Video className="h-5 w-5" />}
        inactiveIcon={<VideoOff className="h-5 w-5" />}
        label={isVideoOn ? labels.turnOffCamera : labels.turnOnCamera}
      />

      <CaptionButton isOn={isCaptionOn} onToggle={onToggleCaption} label={labels.caption} />

      <div className="bg-warm-gray/20 h-6 w-px" />

      <Tooltip content={labels.endCall}>
        <Button
          isIconOnly
          size="lg"
          className="bg-terracotta/10 text-terracotta hover:bg-terracotta h-12 w-12 rounded-xl shadow-none transition-all hover:text-white"
          onPress={onEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </Tooltip>
    </motion.div>
  );
}

function ControlIconButton({
  isActive,
  onClick,
  activeIcon,
  inactiveIcon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip content={label}>
      <Button
        isIconOnly
        size="lg"
        variant="light"
        className={`h-12 w-12 rounded-xl border transition-all ${
          isActive
            ? 'bg-soft-clay/50 text-charcoal hover:bg-soft-clay border-transparent'
            : 'border-warm-gray/30 text-charcoal/50 hover:bg-soft-clay/30 hover:text-charcoal bg-transparent'
        }`}
        onPress={onClick}
        aria-label={label}
      >
        {isActive ? activeIcon : inactiveIcon}
      </Button>
    </Tooltip>
  );
}
