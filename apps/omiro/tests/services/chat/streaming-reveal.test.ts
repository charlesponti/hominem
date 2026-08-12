import { describe, expect, it } from 'vitest';

import {
  bufferContent,
  findNextChunkEnd,
  flush,
  initialRevealState,
  nextChunk,
  type RevealState,
} from '~/services/chat/streaming-reveal';

describe('findNextChunkEnd', () => {
  it('returns null when content has not reached the chunk target yet', () => {
    expect(findNextChunkEnd('short', 0, 60)).toBeNull();
  });

  it('returns null when the target lands inside the final word with no trailing space yet', () => {
    const content = `${'a'.repeat(30)} verylongwordwithnospaceafterthetargetindex`;
    expect(findNextChunkEnd(content, 0, 60)).toBeNull();
  });

  it('snaps forward to the next space at or after the target', () => {
    const content = `${'a'.repeat(58)} bb cc`;
    // target = 60, so it should cut after "bb " (the first space at/after index 60)
    const end = findNextChunkEnd(content, 0, 60);
    expect(end).not.toBeNull();
    expect(content.slice(0, end as number)).toBe(`${'a'.repeat(58)} bb `);
  });

  it('throws for a non-positive chunk size', () => {
    expect(() => findNextChunkEnd('abc', 0, 0)).toThrow();
  });
});

describe('nextChunk', () => {
  it('never splits a word across chunk boundaries', () => {
    const content = 'The quick brown fox jumps over the lazy dog and keeps running for a while longer';
    let state: RevealState = { content, revealedLength: 0 };
    const chunks: string[] = [];

    for (;;) {
      const result = nextChunk(state, 20);
      if (!result) break;
      chunks.push(result.chunk);
      state = result.state;
    }

    for (const chunk of chunks) {
      expect(chunk.endsWith(' ') || chunk === chunks.at(-1)).toBe(true);
    }
    // Reassembling every emitted chunk reproduces a prefix of the content exactly.
    expect(chunks.join('')).toBe(content.slice(0, chunks.join('').length));
  });

  it('reveals every character exactly once across repeated ticks, no overlap and no gaps', () => {
    const content = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    let state: RevealState = { content, revealedLength: 0 };
    const seen: string[] = [];

    for (let i = 0; i < 100; i++) {
      const result = nextChunk(state, 10);
      if (!result) break;
      seen.push(result.chunk);
      state = result.state;
    }

    expect(seen.join('')).toBe(content.slice(0, seen.join('').length));
    expect(state.revealedLength).toBe(seen.join('').length);
  });

  it('returns null once nothing new is buffered, without re-emitting the last chunk', () => {
    const content = `${'a'.repeat(70)} b`;
    const first = nextChunk({ content, revealedLength: 0 }, 60);
    expect(first).not.toBeNull();
    const second = nextChunk(first?.state as RevealState, 60);
    expect(second).toBeNull();
  });

  it('picks up mid-word content correctly once more of the buffer arrives', () => {
    // Simulates content growing character-by-character from a stream.
    const full = `${'a'.repeat(65)} rest of the sentence continues on`;
    let state: RevealState = initialRevealState;
    const revealed: string[] = [];

    for (let i = 1; i <= full.length; i++) {
      state = bufferContent(state, full.slice(0, i));
      const result = nextChunk(state, 60);
      if (result) {
        revealed.push(result.chunk);
        state = result.state;
      }
    }

    expect(revealed.join('')).toBe(full.slice(0, revealed.join('').length));
    // No chunk should end mid-word (except possibly the very end, unhandled by nextChunk).
    for (const chunk of revealed) {
      expect(chunk.endsWith(' ')).toBe(true);
    }
  });
});

describe('bufferContent', () => {
  it('is a no-op when content is unchanged', () => {
    const state: RevealState = { content: 'hello', revealedLength: 3 };
    expect(bufferContent(state, 'hello')).toBe(state);
  });

  it('extends the buffer when new content continues the old content', () => {
    const state: RevealState = { content: 'hel', revealedLength: 1 };
    const next = bufferContent(state, 'hello');
    expect(next).toEqual({ content: 'hello', revealedLength: 1 });
  });

  it('resets revealedLength when content is not an extension (e.g. regenerate)', () => {
    const state: RevealState = { content: 'first answer', revealedLength: 8 };
    const next = bufferContent(state, 'second answer');
    expect(next).toEqual({ content: 'second answer', revealedLength: 0 });
  });

  it('resets from the initial empty state without treating it as a "not an extension" reset loop', () => {
    const next = bufferContent(initialRevealState, 'hi');
    expect(next).toEqual({ content: 'hi', revealedLength: 0 });
  });
});

describe('flush', () => {
  it('reveals all remaining buffered content as one chunk, ignoring word boundaries', () => {
    const state: RevealState = { content: 'abc defgh', revealedLength: 4 };
    const result = flush(state);
    expect(result).toEqual({
      chunk: 'defgh',
      state: { content: 'abc defgh', revealedLength: 9 },
    });
  });

  it('returns null when everything has already been revealed', () => {
    const state: RevealState = { content: 'abc', revealedLength: 3 };
    expect(flush(state)).toBeNull();
  });

  it('composes with nextChunk so the two never double-reveal the same text', () => {
    const content = 'a short streamed reply that ends mid word right here without a trailing space wooooord';
    let state: RevealState = { content, revealedLength: 0 };
    const revealed: string[] = [];

    while (true) {
      const result = nextChunk(state, 15);
      if (!result) break;
      revealed.push(result.chunk);
      state = result.state;
    }
    const final = flush(state);
    if (final) {
      revealed.push(final.chunk);
      state = final.state;
    }

    expect(revealed.join('')).toBe(content);
    expect(state.revealedLength).toBe(content.length);
  });
});
