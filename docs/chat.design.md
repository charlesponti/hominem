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

## Web parity

`apps/web`'s chat transcript (`components/chat/chat-conversation.tsx`,
`components/chat/chat-message.tsx`) follows the same rules above, adapted to
its `motion/react` stack:

- **New-vs-historical bookkeeping**: `lib/hooks/use-new-message-ids.ts`
  records which message ids were already present when the transcript's owning
  component mounted. `ChatConversation` is remounted per chat
  (`key={chatId}` in `routes/chat/chat.$chatId.tsx`), so this bookkeeping
  resets cleanly on chat switch instead of carrying state across chats.
- **User and assistant message rows**: each `ChatMessage` row's
  `AnimatePresence` sets `initial={isNewMessage}` — a row present at mount
  (history) never replays entrance; a row added afterward (a just-sent user
  message, or an assistant row appearing to stream a reply) fades and lifts
  in at 180ms with `ease: [0.23, 1, 0.32, 1]`. This only gates the row's own
  first mount — a later regeneration swap (thinking → settled content) still
  animates regardless of `isNewMessage`, matching "assistant message settles
  with a brief fade-and-lift on completion" above.
- **Reduced motion**: `useReducedMotion()` (from `motion/react`) zeroes the
  `translateY` travel on both the message row and the loading/error
  transcript states while keeping the opacity fade, so state feedback
  survives and travel doesn't.
- **Interruption**: all transcript motion is opacity/transform-driven via
  `motion/react` and never gates `setDraft`, scroll, cancel, or retry
  handlers — those run synchronously regardless of in-flight animation.
- Reuse the durations/easing already established above (150–220ms,
  `[0.23, 1, 0.32, 1]`) rather than introducing new local constants; the web
  client doesn't yet share a motion-tokens package with Omiro, so duplicated
  literals are the accepted seam until one exists.
