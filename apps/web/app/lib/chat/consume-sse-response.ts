import { decodeSSEFrame } from '@hominem/chat/sse';
import type { ChatStreamEvent } from '@hominem/rpc/types';

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';

  const processLine = (line: string) => {
    const frame = decodeSSEFrame(line);
    if (frame.kind !== 'event') return;

    let event: ChatStreamEvent;
    try {
      event = JSON.parse(frame.data) as ChatStreamEvent;
    } catch {
      return;
    }

    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() as string;
    lines.forEach(processLine);
  }

  lineBuffer += decoder.decode();
  lineBuffer.split('\n').forEach(processLine);
}
