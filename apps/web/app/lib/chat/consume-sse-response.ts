import { createSseDecoder, finishSse, pushSseChunk } from '@hominem/chat/sse';
import {
  createGenerationEventDeduplicator,
  parseGenerationWireEvent,
} from '@hominem/rpc/generation-events';
import type { GenerationWireEvent } from '@hominem/rpc/types';

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: GenerationWireEvent) => void,
  onDone?: () => void,
  options?: {
    deduplicateEvent?: (event: GenerationWireEvent) => GenerationWireEvent | null;
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
  const parseEvent = (data: string) => parseGenerationWireEvent(JSON.parse(data));

  const processOutputs = (
    outputs: ReturnType<typeof pushSseChunk<GenerationWireEvent>>['outputs'],
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
    const result = pushSseChunk<GenerationWireEvent>(state, decoded, parseEvent);
    state = result.state;
    processOutputs(result.outputs);
  }

  const trailingText = decoder.decode();
  const trailing = pushSseChunk<GenerationWireEvent>(state, trailingText, parseEvent);
  const result = finishSse<GenerationWireEvent>(trailing.state, parseEvent);
  processOutputs(trailing.outputs);
  processOutputs(result.outputs);
}
