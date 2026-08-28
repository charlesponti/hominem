import type { ChatGenerationEventRecord } from '@hominem/db';

type Subscriber = {
  queue: ChatGenerationEventRecord[];
  waiters: Array<(event: ChatGenerationEventRecord | null) => void>;
  closed: boolean;
};

const subscribers = new Map<string, Set<Subscriber>>();

function close(generationId: string, subscriber: Subscriber): void {
  subscriber.closed = true;
  for (const resolve of subscriber.waiters.splice(0)) resolve(null);
  const generationSubscribers = subscribers.get(generationId);
  generationSubscribers?.delete(subscriber);
  if (generationSubscribers?.size === 0) subscribers.delete(generationId);
}

export function publishGenerationEvent(event: ChatGenerationEventRecord): void {
  for (const subscriber of subscribers.get(event.generationId) ?? []) {
    const resolve = subscriber.waiters.shift();
    if (resolve) resolve(event);
    else subscriber.queue.push(event);
  }
}

export function subscribeToGenerationEvents(
  generationId: string,
): AsyncIterable<ChatGenerationEventRecord> & {
  close: () => void;
} {
  const subscriber: Subscriber = { queue: [], waiters: [], closed: false };
  const generationSubscribers = subscribers.get(generationId) ?? new Set<Subscriber>();
  generationSubscribers.add(subscriber);
  subscribers.set(generationId, generationSubscribers);

  return {
    close: () => close(generationId, subscriber),
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if (subscriber.queue.length > 0) {
            return { done: false, value: subscriber.queue.shift()! };
          }
          if (subscriber.closed) return { done: true, value: undefined };
          const event = await new Promise<ChatGenerationEventRecord | null>((resolve) => {
            subscriber.waiters.push(resolve);
          });
          return event ? { done: false, value: event } : { done: true, value: undefined };
        },
        /**
         *
         * @example
         * ```ts
         * const subscription = subscribeToGenerationEvents(generationId);
         * for await (const event of subscription) {
         *   // Handle the event
         * }
         * subscription.close();
         * subscription.return(); // This will also close the subscription
         * ```
         * @returns
         */
        return: async () => {
          close(generationId, subscriber);
          return { done: true, value: undefined };
        },
      };
    },
  };
}
