// Every timeout in the generation pipeline, in one place, with the
// relationships between them expressed as real code instead of comments
// that can drift. Previously five independently-chosen constants lived
// across chat-generation-provider.ts, generation-interpreter.ts,
// chats.$chatId.generation.ts and the client transport implementations.
//
// CHAT_REQUEST_TIMEOUT_MS in @hominem/ai's text.ts is the one exception —
// it's a general AI-client request deadline used by unrelated
// (non-generation) callers too (enhanceText, generateNoteFromChat), and
// @hominem/ai doesn't depend on @hominem/chat, so it can't import from
// here. It's still cross-referenced in comments on both sides.
export const GENERATION_TIMING = {
  // How long the OpenRouter provider can go without a chunk before we
  // treat the stream as stalled (see StreamIdleTimeoutError).
  providerIdleMs: 10_000,
  // After a finish-reason chunk, how long to wait for an optional
  // usage-only trailer chunk before moving on.
  usageTrailerGraceMs: 500,
  // Per-command timeouts in the effect interpreter — how long a persist,
  // tool call, or save can run before it's treated as hung.
  effectMs: {
    persist: 15_000,
    executeTool: 60_000,
    previewTool: 15_000,
    saveGeneration: 15_000,
  },
  // How often services/api writes an SSE `:heartbeat` comment frame while
  // a generation is in progress.
  heartbeatMs: 15_000,
  // How long the browser waits for SSE data before treating the
  // connection as stalled. Must exceed heartbeatMs — this is the
  // relationship that used to be implicit.
  get clientIdleMs() {
    return GENERATION_TIMING.heartbeatMs * 2 + 5_000;
  },
} as const;
