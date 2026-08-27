export type SSEFrame = { kind: 'empty' } | { kind: 'done' } | { kind: 'event'; data: string };

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
