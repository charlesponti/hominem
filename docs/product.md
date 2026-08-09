# I. Product

Hominem is one product system. The API, Omiro, and every shared package exist to make a person's work easier to capture, understand, continue, and act on. The system earns complexity only when it removes friction from that loop.

## The active product shape

- **Omiro** is the Apple-native surface for capturing a thought, continuing a conversation, saving a note, and turning material into tasks.
- **API** is the authority for identity, persistence, orchestration, and work that must not be trusted to a client.
- **Career** is a web product with server-owned data access.
- **Finance** exists in the monorepo; its release tier is an explicit portfolio decision, never an accidental implication of a command or workflow.

## Omiro language

Words define product boundaries. Use them consistently.

- **All** — Signed-in root surface and mixed recent list of conversations and documents.
- **Time** — The task-and-calendar surface.
- **thread** — Presentation-only language for an existing chat or note; persisted kind never changes.
- **chat** — A conversation.
- **note** — A saved note.
- **composer** — The input surface that creates notes or starts chats.
- **task** — An actionable item derived from a chat, note, or direct creation.
- **time block** — A task or calendar event that occupies, or is intended to occupy, time.
- **settings** — Account and app settings.
- **archived chats** — Conversations intentionally removed from the active flow.

Do not use `workspace` as a product or module concept. Do not use `feed` as an active app concept. Reserve `session` for authentication. Avoid `artifact` in app-owned exports and feature names. When code needs a `chat | note` union, name it explicitly (`ContentKind`, `ResumeTarget`) instead of abstracting it into product language.

## Product laws

- Capture is immediate. A person can type, speak, attach context, or resume work without first configuring the system.
- The product names actual things. It does not hide ordinary work behind metaphors, slogans, or invented categories.
- AI assists with a visible human outcome: clearer text, a continued chat, or tasks a person can inspect and change. It is not a substitute for state, authority, or recoverability.
- A user never loses submitted meaning because a secondary automation fails. Raw text is preserved before optional cleanup; extracted task failures expose the transcript for recovery.
- Setup, permissions, and operational machinery stay out of the task surface until the person actually needs them.
- Tasks and calendar events share one time model. A fixed block has a scheduled interval; a flexible block has a duration and scheduling window until it is placed.
- Time is the single task-and-calendar surface. Home links to Time instead of exposing a separate Tasks view; task details remain available from a time block.
- Time uses a clock, not a calendar destination. iOS Calendar is a source within Time, not the product information architecture.
- `TimeStream` is the UI projection of source-backed task and calendar items. It orders them together without converting either source into the other.
- Time keeps unscheduled tasks in a distinct secondary Unscheduled screen. They do not appear in the chronological schedule until they receive a due date or scheduled interval.
- The All composer infers Document for multiline or structured text and Conversation for ordinary single-paragraph text. A visible manual override is sticky for that draft and resets only after clear or successful submit.

## Product decision test

Before adding a feature, answer all four questions in the implementation:

1. What human work becomes easier?
2. What is the smallest visible outcome?
3. What does the person recover if automation, network, or permission fails?
4. Which existing product word and surface own it?

If those answers are unclear, the feature is not ready to spread across the system.
