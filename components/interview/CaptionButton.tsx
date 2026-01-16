'use client';

import { Button, Tooltip } from '@heroui/react';
import { Subtitles, CaptionsOff } from 'lucide-react';

interface CaptionButtonProps {
  isOn: boolean;
  onToggle: () => void;
  label: string;
}

/**
 * Caption toggle button for AI subtitles
 * Simple on/off toggle matching the style of mic/video buttons
 */
export function CaptionButton({ isOn, onToggle, label }: CaptionButtonProps) {
  return (
    <Tooltip content={label}>
      <Button
        isIconOnly
        size="lg"
        variant="light"
        onPress={onToggle}
        className={`h-10 w-10 rounded-xl border transition-all md:h-12 md:w-12 ${
          isOn
            ? 'bg-soft-clay/50 text-charcoal hover:bg-soft-clay border-transparent'
            : 'border-warm-gray/30 text-charcoal/50 hover:bg-soft-clay/30 hover:text-charcoal bg-transparent'
        }`}
        aria-label={label}
        aria-pressed={isOn}
      >
        {isOn ? (
          <Subtitles className="h-4 w-4 md:h-5 md:w-5" />
        ) : (
          <CaptionsOff className="h-4 w-4 md:h-5 md:w-5" />
        )}
      </Button>
    </Tooltip>
  );
}
