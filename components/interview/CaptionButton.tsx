'use client';

import { Button } from '@heroui/react';
import { Subtitles } from 'lucide-react';

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
    <Button
      isIconOnly
      size="lg"
      variant="light"
      onPress={onToggle}
      className={`h-12 w-12 rounded-xl border transition-all ${
        isOn
          ? 'bg-soft-clay/50 text-charcoal hover:bg-soft-clay border-transparent'
          : 'border-warm-gray/30 text-charcoal/50 hover:bg-soft-clay/30 hover:text-charcoal bg-transparent'
      }`}
      aria-label={label}
      aria-pressed={isOn}
    >
      <Subtitles className="h-5 w-5" />
    </Button>
  );
}
