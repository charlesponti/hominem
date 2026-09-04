# Chat Runtime Ownership

`@hominem/chat` owns the reusable chat plumbing used by studio applications and
services. Its server runtime owns generation lifecycle orchestration, tool
confirmation and idempotency, durable event sequencing, persistence-before-
publication, cancellation, retry, and final context accounting. Its client
runtime owns the canonical HTTP/SSE protocol, event parsing, deduplication,
replay, checkpoints, reconnection, and observable generation state.

The package remains portable through adapters. Providers, domain tools,
repositories, publishers, Redis, authentication, and platform transports are
injected at composition boundaries. The core does not import application
services, a database, React Query, Expo, or a specific provider.

Applications retain product-specific reactions such as cache invalidation,
optimistic UI, haptics, audio, navigation, and presentation. They consume the
package's typed lifecycle events rather than reproducing chat protocol logic.
