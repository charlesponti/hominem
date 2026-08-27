import type { ChatStreamEvent } from '@hominem/rpc/types';

export async function consumeChatStream(
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
    if (!line.startsWith('data: ')) return;
    const payload = line.slice(6).trimEnd();
    if (payload === '[DONE]') return;

    let event: ChatStreamEvent;
    try {
      event = JSON.parse(payload) as ChatStreamEvent;
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
    lineBuffer = lines.pop() ?? '';
    lines.forEach(processLine);
  }

  lineBuffer += decoder.decode();
  lineBuffer.split('\n').forEach(processLine);
}
