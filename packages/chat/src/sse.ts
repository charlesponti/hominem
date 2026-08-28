export type SSEFrame = { kind: 'empty' } | { kind: 'done' } | { kind: 'event'; data: string };

export interface SseDecoderState {
  buffer: string;
}

export type SseOutput<TEvent> =
  | { kind: 'empty' }
  | { kind: 'done' }
  | { kind: 'event'; event: TEvent }
  | { kind: 'malformed'; data: string; error: unknown };

type ParseSseEvent<TEvent> = (data: string) => TEvent;

const parseJson = <TEvent>(data: string): TEvent => JSON.parse(data);

export function createSseDecoder(): SseDecoderState {
  return { buffer: '' };
}

export function decodeSSEFrame(frame: string): SSEFrame {
  const dataLines = frame
    // Split the frame into lines, handling both LF and CRLF line endings.
    .split(/\r?\n/)
    // Remove trailing whitespace from each line, as per the SSE spec.
    .map((line) => line.trimEnd())
    // Filter out comment lines (those starting with ':') and empty lines, as they are not part of the data.
    .flatMap((line) => {
      if (line.startsWith('data: ')) return [line.slice(6)];
      if (line.startsWith('data:')) return [line.slice(5)];
      return [];
    });

  if (dataLines.length === 0) return { kind: 'empty' };

  // Rejoin the remaining data lines into a single string, preserving line breaks.
  // This is important because SSE allows multi-line data fields.
  // We need to maintain the original structure of the data.
  const data = dataLines.join('\n');
  return data === '[DONE]' ? { kind: 'done' } : { kind: 'event', data };
}

function getFrameDelimiter(value: string): { index: number; length: number } | null {
  const match = /\r?\n\r?\n/.exec(value);
  return match ? { index: match.index, length: match[0].length } : null;
}

function decodeSseEvent<TEvent>(
  frame: string,
  parseEvent: ParseSseEvent<TEvent>,
): SseOutput<TEvent> {
  const decoded = decodeSSEFrame(frame);
  if (decoded.kind === 'empty') return { kind: 'empty' };
  if (decoded.kind === 'done') return { kind: 'done' };

  try {
    return { kind: 'event', event: parseEvent(decoded.data) };
  } catch (error) {
    return { kind: 'malformed', data: decoded.data, error };
  }
}

function decodeCompleteFrames<TEvent>(
  buffer: string,
  parseEvent: ParseSseEvent<TEvent>,
): { buffer: string; outputs: SseOutput<TEvent>[] } {
  const outputs: SseOutput<TEvent>[] = [];
  let remaining = buffer;
  let delimiter = getFrameDelimiter(remaining);

  while (delimiter) {
    const frame = remaining.slice(0, delimiter.index);
    remaining = remaining.slice(delimiter.index + delimiter.length);
    outputs.push(decodeSseEvent(frame, parseEvent));
    delimiter = getFrameDelimiter(remaining);
  }

  return { buffer: remaining, outputs };
}

export function pushSseChunk<TEvent>(
  state: SseDecoderState,
  chunk: string,
  parseEvent: ParseSseEvent<TEvent> = parseJson,
): { state: SseDecoderState; outputs: SseOutput<TEvent>[] } {
  const decoded = decodeCompleteFrames(`${state.buffer}${chunk}`, parseEvent);
  return { state: { buffer: decoded.buffer }, outputs: decoded.outputs };
}

export function finishSse<TEvent>(
  state: SseDecoderState,
  parseEvent: ParseSseEvent<TEvent> = parseJson,
): { state: SseDecoderState; outputs: SseOutput<TEvent>[] } {
  if (state.buffer.trim().length === 0) {
    return { state: createSseDecoder(), outputs: [] };
  }

  return {
    state: createSseDecoder(),
    outputs: [decodeSseEvent(state.buffer, parseEvent)],
  };
}
