# Chat Design

Omiro chat's UX and motion design decisions. Feature ownership, verification
status, and web parity live in [chat.capabilities.md](chat.capabilities.md).

## Motion

Omiro chat animates only new-message events — opening a chat, scrolling, and reading existing history stay quiet. Do not animate list history, typing in the composer, or keyboard-initiated actions.

The prior **kinetic correspondence** design (the composer as the physical source of every new message, via a measured flight cloned out of the composer into the transcript) is retired — its overlay (`chat-motion-overlay.tsx`) was never actually mounted in the app tree, so the flight silently never rendered. Replaced with a plain list-row entrance: simpler, and it can't go silently missing the way an unmounted overlay did.

### Rules

- **User message**: a just-sent row lifts and fades in at its own position in the transcript (`chat-message.tsx`'s row `entering` animation, gated by `chat-message-list.tsx`'s new-vs-historical bookkeeping so a chat's existing history never replays it). No composer-sourced clone, no overlay, no measured handoff. The composer clears immediately and the animation never delays sending, scrolling, or the next interaction.
- **Assistant message**: one response surface prints text as it streams — no artificial chunk buffering or per-chunk fade. The three-dot activity indicator (`chat-thinking-indicator.tsx`) lives inside that surface, not as a separate loading row, and settles with a brief fade-and-lift on completion.
- **No fabricated progress.** LLM response length isn't knowable in advance. The activity indicator communicates ongoing work, never an invented percentage or estimated duration.
- **Motion explains a causal state change; it is not decorative delay.** Routine message transitions target 150–220ms. Typing dots are the only repeating motion, and they stop looping the instant `Reduce Motion` is on.
- **Every animation is interruptible.** A send, retry, stream failure, background/foreground reconcile, or list refresh must cancel and settle cleanly from wherever it currently is — never leave a stuck spinner or a mid-flight overlay.
- **Respect `Reduce Motion`** (`hooks/use-reduced-motion.ts`): replace travel, bounce, and printing movement with immediate content plus brief opacity feedback. No looping dots under Reduce Motion.
- Reuse `@ponti-studios/ui`'s shared motion tokens and Reanimated. Do not add a motion dependency or hardcode a local timing/easing value that duplicates a shared export.
