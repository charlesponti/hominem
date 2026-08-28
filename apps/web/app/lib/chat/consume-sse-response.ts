import { createSseDecoder, finishSse, pushSseChunk } from '@hominem/chat/sse';
import {
  createGenerationEventDeduplicator,
  parseGenerationStreamEvent,
} from '@hominem/rpc/generation-events';
import type { GenerationStreamEvent } from '@hominem/rpc/types';

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: GenerationStreamEvent) => void,
  onDone?: () => void,
  options?: {
    deduplicateEvent?: (event: GenerationStreamEvent) => GenerationStreamEvent | null;
    onDurableSequence?: (sequence: number) => void;
  },
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const deduplicate = options?.deduplicateEvent ?? createGenerationEventDeduplicator();
  let state = createSseDecoder();
  const parseEvent = (data: string) => parseGenerationStreamEvent(JSON.parse(data));

  const processOutputs = (
    outputs: ReturnType<typeof pushSseChunk<GenerationStreamEvent>>['outputs'],
  ) => {
    outputs.forEach((output) => {
      if (output.kind === 'event') {
        const event = deduplicate(output.event);
        if (event) {
          if ('sequence' in event) options?.onDurableSequence?.(event.sequence);
          onEvent(event);
        }
      }
      if (output.kind === 'done') onDone?.();
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    const result = pushSseChunk<GenerationStreamEvent>(state, decoded, parseEvent);
    state = result.state;
    processOutputs(result.outputs);
  }

  const trailingText = decoder.decode();
  const trailing = pushSseChunk<GenerationStreamEvent>(state, trailingText, parseEvent);
  const result = finishSse<GenerationStreamEvent>(trailing.state, parseEvent);
  processOutputs(trailing.outputs);
  processOutputs(result.outputs);
}
