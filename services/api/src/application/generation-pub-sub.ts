import type { ChatGenerationEventRecord } from '@hominem/db/chats';

// In-process pub/sub for one generation's durable events, keyed by
// generationId. This is the ONLY thing the SSE route reads from — it never
// touches Postgres directly, and there is no local-write shortcut: even an
// event written by THIS process only reaches its own subscribers by going
// out to Postgres and back. The single caller of GenerationPubSub.publish is
// generation-notify-listener.ts, which turns a Postgres NOTIFY (fired by the
// app.notify_chat_generation_event trigger on insert) into a call here — so
// every event, local or from another instance, arrives the same way.
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

export const GenerationPubSub = {
  publish(event: ChatGenerationEventRecord): void {
    for (const subscriber of subscribers.get(event.generationId) ?? []) {
      const resolve = subscriber.waiters.shift();
      if (resolve) resolve(event);
      else subscriber.queue.push(event);
    }
  },

  subscribe(generationId: string): AsyncIterable<ChatGenerationEventRecord> & {
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
          // called when a for-await loop breaks/returns early — also closes the subscription
          return: async () => {
            close(generationId, subscriber);
            return { done: true, value: undefined };
          },
        };
      },
    };
  },
};
