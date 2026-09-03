import { Switch } from '@ponti-studios/ui/forms';
import { m, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import type { ResponseLength } from '~/lib/hooks/use-response-length';

const RESPONSE_LENGTHS: ResponseLength[] = ['short', 'medium', 'long'];

const RESPONSE_LENGTH_OPTIONS: Record<
  ResponseLength,
  { emoji: string; name: string; description: string }
> = {
  short: {
    emoji: '🍿',
    name: 'Snack',
    description: 'Fast answers with no extra garnish.',
  },
  medium: {
    emoji: '🍽️',
    name: 'Serve',
    description: 'Balanced detail for everyday questions.',
  },
  long: {
    emoji: '📚',
    name: 'Lore',
    description: 'Thorough answers with structure and context.',
  },
};

export interface ChatResponseSettingsProps {
  value: ResponseLength;
  onChange: (value: string) => void;
  onClose: () => void;
  walkieTalkieMode: boolean;
  onChangeWalkieTalkieMode: (value: boolean) => void;
}

export function ChatResponseSettings({
  value,
  onChange,
  onClose,
  walkieTalkieMode,
  onChangeWalkieTalkieMode,
}: ChatResponseSettingsProps) {
  const [draftValue, setDraftValue] = useState(value);
  const reduceMotion = useReducedMotion();

  const commitValue = () => {
    if (draftValue !== value) onChange(draftValue);
  };

  return (
    <div aria-label="Response settings" className="flex flex-col gap-5 px-1 pb-1">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">How should Omiro answer?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the level of detail you want in each reply.
          </p>
        </div>

        <div aria-label="Response length" className="flex flex-col gap-2" role="radiogroup">
          {RESPONSE_LENGTHS.map((length) => {
            const option = RESPONSE_LENGTH_OPTIONS[length];
            const isSelected = length === draftValue;

            return (
              <m.button
                animate={{
                  opacity: isSelected ? 1 : 0.78,
                  scale: isSelected || reduceMotion ? 1 : 0.985,
                }}
                aria-checked={isSelected}
                className={`group relative flex min-h-16 flex-col items-start gap-2 rounded-xl border p-3.5 pr-12 text-left transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${isSelected ? 'border-primary/50 bg-primary/8 shadow-sm' : 'border-border/70 bg-background/35 hover:border-primary/30 hover:bg-muted/50'}`}
                key={length}
                onClick={() => setDraftValue(length)}
                role="radio"
                transition={{ duration: reduceMotion ? 0.08 : 0.2, ease: [0.23, 1, 0.32, 1] }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`text-3xl leading-none transition-transform duration-200 motion-reduce:transition-none ${isSelected ? 'scale-105' : 'grayscale-[0.35] opacity-80 group-hover:grayscale-0 group-hover:opacity-100'}`}
                >
                  {option.emoji}
                </span>
                <span className="text-sm font-semibold text-foreground">{option.name}</span>
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-3.5 flex size-5 items-center justify-center rounded-md border text-xs font-bold transition-[background-color,border-color,color,transform] duration-200 motion-reduce:transition-none ${isSelected ? 'scale-100 border-primary bg-primary text-primary-foreground' : 'scale-90 border-border/80 text-transparent'}`}
                >
                  ✓
                </span>
                <div
                  className={`grid w-full overflow-hidden transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${isSelected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <m.p
                      animate={{
                        opacity: isSelected ? 1 : 0,
                        transform: isSelected
                          ? 'translateY(0) scaleY(1)'
                          : 'translateY(-4px) scaleY(0.85)',
                      }}
                      aria-hidden={!isSelected}
                      className="w-full border-t border-primary/15 pt-2 text-xs leading-relaxed text-muted-foreground"
                      initial={false}
                      transition={{ duration: reduceMotion ? 0.08 : 0.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {option.description}
                    </m.p>
                  </div>
                </div>
              </m.button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <h3 className="text-sm font-semibold text-foreground">Walkie-talkie mode</h3>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Always read replies aloud, even when you type.
          </p>
          <Switch
            aria-label="Walkie-talkie mode"
            checked={walkieTalkieMode}
            onCheckedChange={(checked) => onChangeWalkieTalkieMode(Boolean(checked))}
          />
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
