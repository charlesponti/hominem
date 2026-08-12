// Pure state machine for pacing a streamed chat message into fade-in chunks.
//
// The rule that matters: a character is either (a) still buffered and
// invisible, or (b) revealed and fading in — never both. There is no "live"
// path that shows text before its reveal turn. `bufferContent` only grows
// the buffer; `nextChunk`/`flush` are the only ways characters become
// visible, and each character is emitted in exactly one chunk, exactly once.

export interface RevealState {
  /** Full content received from the stream so far. */
  content: string;
  /** How many leading characters of `content` have already been revealed. */
  revealedLength: number;
}

export const initialRevealState: RevealState = {
  content: '',
  revealedLength: 0,
};

/**
 * Merge newly streamed content into the buffer. Does not reveal anything.
 * If `content` isn't an extension of the previous buffer (e.g. a
 * regenerate replaced the message), the state resets to start fresh.
 */
export function bufferContent(state: RevealState, content: string): RevealState {
  if (content === state.content) return state;
  if (!content.startsWith(state.content)) {
    return { content, revealedLength: 0 };
  }
  return { ...state, content };
}

/**
 * Find the end of the next revealable chunk starting at `from`, snapped to
 * a word boundary at or after `from + chunkSize` characters. Returns null
 * when there isn't yet enough buffered content to safely cut a chunk
 * without splitting a word (i.e. more content must arrive first).
 */
export function findNextChunkEnd(content: string, from: number, chunkSize: number): number | null {
  if (chunkSize <= 0) throw new Error('chunkSize must be positive');
  const target = from + chunkSize;
  if (content.length <= target) return null;
  const spaceIdx = content.indexOf(' ', target);
  return spaceIdx === -1 ? null : spaceIdx + 1;
}

/**
 * Reveal the next chunk, if one is available. Chunks are only ever
 * appended — repeated calls without new buffered content return null.
 */
export function nextChunk(
  state: RevealState,
  chunkSize: number,
): { chunk: string; state: RevealState } | null {
  const end = findNextChunkEnd(state.content, state.revealedLength, chunkSize);
  if (end === null) return null;
  return {
    chunk: state.content.slice(state.revealedLength, end),
    state: { ...state, revealedLength: end },
  };
}

/**
 * Reveal everything still buffered as a single final chunk, ignoring word
 * boundaries. Intended for when streaming has ended and pacing should stop
 * gating what's on screen.
 */
export function flush(state: RevealState): { chunk: string; state: RevealState } | null {
  if (state.revealedLength >= state.content.length) return null;
  return {
    chunk: state.content.slice(state.revealedLength),
    state: { ...state, revealedLength: state.content.length },
  };
}
