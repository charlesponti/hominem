# Product Architecture

## Product model

Hakumi is a notes-first personal workspace built around a unified feed.

The feed is the product's main surface. It holds both notes and chats in one chronology, so capture, retrieval, and follow-up all happen inside the same system instead of across separate tools.

## Core objects

### Note

A note is the primary unit of thought.

Notes can start rough. They do not require structure before they are useful. A note can hold writing, tasks, observations, partial ideas, or references that may become more meaningful later.

### Chat

Chat is the product's thinking surface.

Chats are first-class objects, but they exist to help people work with their notes and surrounding context. A chat can reference notes, deepen an idea, answer questions about prior thinking, or help turn context into action.

### Context

Context is the connective layer between notes and chat.

Notes can be attached to a chat explicitly, and the system should increasingly surface relevant context automatically. The important product rule is that context belongs to the workspace, not to a single isolated prompt.

### Feed

The feed is the unified chronology of work.

Both notes and chats appear in the same timeline and rise when they are updated. This keeps the product anchored in recency, continuity, and recall rather than in hard boundaries between content types.

## Core loop

Hakumi should support one compounding loop:

1. Capture
2. Organize
3. Retrieve
4. Act

### Capture

Capture must be fast and forgiving. People should be able to write, speak, or drop in a fragment without deciding too much up front.

### Organize

Organization should emerge from use. Tags, links, related context, and attached notes should help notes become more useful over time without forcing rigid structure at the moment of capture.

### Retrieve

Retrieval should happen through both browsing and asking. People should be able to scan the feed, open a note, or use chat to ask what they already know.

### Act

The product should help people move from remembered context to the next useful step. That may mean continuing a conversation, refining a note, extracting a plan, or turning a thought into a concrete task.

## Primary surfaces

### Feed

The feed is the default home surface.

It should feel like one calm place to return to. Notes and chats live together here because the product's value comes from continuity across both.

### Note view

The note view is the focused writing and editing surface.

When someone is inside a note, the note itself becomes primary. The rest of the workspace should recede so writing and refinement feel deliberate.

### Chat view

The chat view is the focused reasoning surface.

It should preserve conversational flow while keeping note context close at hand. Chat is for synthesis, exploration, and follow-up, not for replacing the note model.

### Composer

The composer is the always-available entry point into the workspace.

It should adapt to context:

- in the feed, it lets the user decide whether a new input becomes a note or a chat
- in chat, it continues the active conversation
- in note view, the note editor replaces it as the dominant writing surface

## Platform roles

Hakumi is one product across platforms, but each platform can lean into a different job.

### Mobile

Mobile is optimized for capture, quick review, and lightweight continuation.

It should feel immediate, native, and reliable when someone wants to save a thought before it disappears.

### Web and desktop

Web and desktop are optimized for deeper reading, editing, and synthesis.

They should feel like the best place to review context, shape notes, and work through longer chat-driven thinking.

## Product boundaries

Hakumi is not currently defined as a suite of separate life apps.

Older architecture may still contain domains like finance, health, places, or lists, but the product documentation should treat those as secondary or future possibilities unless they clearly strengthen the core workspace model.

The canonical product promise is:

- one workspace
- shared context
- notes as the center
- chat as a thinking tool
