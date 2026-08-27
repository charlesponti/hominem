import { useState } from 'react';

import type { ResponseLength } from '~/lib/hooks/use-response-length';

const RESPONSE_LENGTHS: ResponseLength[] = ['short', 'medium', 'long'];

const RESPONSE_LENGTH_OPTIONS: Record<
  ResponseLength,
  { emoji: string; name: string; caption: string }
> = {
  short: { emoji: '🎬', name: 'Danny DeVito', caption: 'Short · under 600 characters' },
  medium: { emoji: '🍔', name: 'Value Meal', caption: 'Medium · a 3–5 min read' },
  long: { emoji: '🌭', name: "Nathan's Famous", caption: 'Long · full essay, outlined first' },
};

export interface ChatResponseSettingsProps {
  value: ResponseLength;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function ChatResponseSettings({ value, onChange, onClose }: ChatResponseSettingsProps) {
  const [draftValue, setDraftValue] = useState(value);
  const selectedIndex = Math.max(0, RESPONSE_LENGTHS.indexOf(draftValue));
  const selectedOption = RESPONSE_LENGTH_OPTIONS[draftValue];

  const commitValue = () => {
    if (draftValue !== value) onChange(draftValue);
  };

  return (
    <div aria-label="Response settings" className="flex flex-col gap-6 px-1 pb-1">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Response length</h3>
        <p className="text-sm text-muted-foreground">
          Choose how long you want the assistant’s replies to be.
        </p>

        <div aria-live="polite" className="flex flex-col items-center gap-0.5 py-2">
          <span className="text-4xl leading-none" role="img" aria-label={selectedOption.name}>
            {selectedOption.emoji}
          </span>
          <span className="text-sm font-semibold text-foreground">{selectedOption.name}</span>
          <span className="text-xs text-muted-foreground">{selectedOption.caption}</span>
        </div>

        <div className="px-2">
          <input
            aria-label="Response length"
            className="response-length-slider h-6 w-full cursor-pointer"
            max={RESPONSE_LENGTHS.length - 1}
            min={0}
            onChange={(event) =>
              setDraftValue(RESPONSE_LENGTHS[Number(event.target.value)] ?? 'medium')
            }
            step={1}
            type="range"
            value={selectedIndex}
          />
        </div>

        <div className="flex justify-between px-2 text-base" aria-hidden="true">
          {RESPONSE_LENGTHS.map((length) => (
            <span className={length === draftValue ? 'opacity-100' : 'opacity-40'} key={length}>
              {RESPONSE_LENGTH_OPTIONS[length].emoji}
            </span>
          ))}
        </div>
      </div>

      <button
        aria-label="Close response settings"
        className="h-9 rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => {
          commitValue();
          onClose();
        }}
        type="button"
      >
        Done
      </button>
    </div>
  );
}
