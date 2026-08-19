# II. Chat motion

Omiro chat's new-message motion is **kinetic correspondence**: the composer is the physical source of every new message. This supersedes the prior calm/minimal chat-motion treatment, and only for new-message events — opening a chat, scrolling, and reading existing history stay quiet. Do not animate list history, typing in the composer, or keyboard-initiated actions.

## Rules

- **User message**: submitted content lifts from the composer into the transcript as a single continuous motion (`chat-motion-overlay.tsx`), landing once in the optimistic row with no duplicate bubble or visible remount. The composer clears immediately; the flight is a visual layer only and never delays sending, scrolling, or the next interaction.
- **Assistant message**: one response surface prints text as it streams — no artificial chunk buffering or per-chunk fade. The three-dot activity indicator (`chat-thinking-indicator.tsx`) lives inside that surface, not as a separate loading row, and settles with a brief fade-and-lift on completion.
- **No fabricated progress.** LLM response length isn't knowable in advance. The activity indicator communicates ongoing work, never an invented percentage or estimated duration.
- **Motion explains a causal state change; it is not decorative delay.** Routine message transitions target 150–220ms. Typing dots are the only repeating motion, and they stop looping the instant `Reduce Motion` is on.
- **Every animation is interruptible.** A send, retry, stream failure, background/foreground reconcile, or list refresh must cancel and settle cleanly from wherever it currently is — never leave a stuck spinner or a mid-flight overlay.
- **Respect `Reduce Motion`** (`hooks/use-reduced-motion.ts`): replace travel, bounce, and printing movement with immediate content plus brief opacity feedback. No looping dots under Reduce Motion.
- Reuse `@ponti-studios/ui`'s shared motion tokens and Reanimated. Do not add a motion dependency or hardcode a local timing/easing value that duplicates a shared export.
- Do not use Reanimated shared-element transitions for the composer-to-transcript handoff — they remain experimental. Use a same-screen temporary overlay measured from the composer and the destination row instead.
