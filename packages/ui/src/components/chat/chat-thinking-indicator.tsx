import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/utils';

const phrases = ['Thinking', 'Considering', 'Composing', 'Reflecting', 'Reasoning'];

export function ChatThinkingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [dots, setDots] = useState('');
  const orbRef = useRef<HTMLDivElement>(null);

  // Rotate phrases every 2.5s
  useEffect(() => {
    const phraseTimer = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 2500);
    return () => window.clearInterval(phraseTimer);
  }, []);

  // Animate dots
  useEffect(() => {
    const dotTimer = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => window.clearInterval(dotTimer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-1 py-4">
      {/* Breathing orb — the soul of the thinking state */}
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow */}
        <div
          className="absolute size-8 rounded-full bg-[var(--color-accent)]/10 void-anim-thinking"
          style={{ animationDuration: '2.5s' }}
        />
        {/* Inner orb */}
        <div
          ref={orbRef}
          className={cn(
            'relative size-5 rounded-full',
            'bg-gradient-to-br from-[var(--color-accent)] to-[#C4956A]',
            'shadow-[0_0_12px_rgba(212,165,116,0.3)]',
            'void-anim-thinking',
          )}
        >
          {/* Specular highlight */}
          <div className="absolute left-1 top-0.5 size-1.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Phrase with crossfade */}
      <span
        key={phraseIndex}
        className="text-[13px] font-medium text-[var(--color-text-tertiary)] void-anim-enter"
      >
        {phrases[phraseIndex]}
        {dots}
      </span>
    </div>
  );
}
