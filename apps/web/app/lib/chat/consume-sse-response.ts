import { createSseDecoder, finishSse, pushSseChunk } from '@hominem/chat/sse';
import { parseGenerationStreamEvent } from '@hominem/rpc/generation-events';
import type { GenerationStreamEvent } from '@hominem/rpc/types';

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: GenerationStreamEvent) => void,
  onDone?: () => void,
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let state = createSseDecoder();

  const processOutputs = (
    outputs: ReturnType<typeof pushSseChunk<GenerationStreamEvent>>['outputs'],
  ) => {
    outputs.forEach((output) => {
      if (output.kind === 'event') onEvent(output.event);
      if (output.kind === 'done') onDone?.();
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    const result = pushSseChunk<GenerationStreamEvent>(state, decoded);
    state = result.state;
    processOutputs(result.outputs);
  }

  const trailingText = decoder.decode();
  const trailing = pushSseChunk<GenerationStreamEvent>(state, trailingText);
  const result = finishSse<GenerationStreamEvent>(trailing.state, (data) =>
    parseGenerationStreamEvent(JSON.parse(data)),
  );
  processOutputs(trailing.outputs);
  processOutputs(result.outputs);
}
