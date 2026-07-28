# Stage 3: Smart Creation Defaults

**Risk: Medium** — depends on Stage 1's compose flow, adds an inference API call.

## Goal

Remove the kind decision from compose entirely by classifying the user's draft in real time and adapting the submit button. The user never explicitly chooses "chat" or "note" — the system infers intent and lets the user override only when it's wrong.

## Scope

### UX changes

1. **Adaptive submit button**

   The compose bar has a single submit button. Its label changes in real time as the user types, based on the classification of the current draft:

   - "Send message" (chat-leaning)
   - "Save note" (note-leaning)

   The label updates on every keystroke with a debounce of ~300ms. A subtle transition (crossfade or morph) on the button keeps it from feeling jittery.

2. **Long-press to override**

   Long-pressing the submit button expands it into two buttons side by side: "Send message" and "Save note." The user can tap the non-default option. This replaces the bottom sheet from Stage 1 entirely — no modal, no interruption.

3. **Classification confidence indicator (optional, test first)**

   If the classifier is borderline (e.g., 55% confidence), the submit button could show a faint secondary label: "or save as note." If confidence is high (>90%), the secondary label is hidden. This is a visual polish detail that can be cut if it adds noise.

4. **Post-creation feedback**

   After creation, the new item appears in the merged feed with no kind-label — it's just a row in the inbox. The user only sees the kind through the icon (chat bubble vs. document) and the detail screen behavior. If the classification was wrong, the user can delete and re-compose with a long-press override.

### Technical changes

**Classification approach** — two tiers, start with the simple one:

**Tier 1: Heuristic (no API call, instant)**

- Text length > 200 characters → note
- Text contains line breaks → note
- Text ends with `?` → chat
- Text starts with imperative verb ("Write," "Explain," "Summarize") → chat
- Otherwise → chat (default)

This covers ~80% of cases. Ship this first, measure override rate, then decide if Tier 2 is worth it.

**Tier 2: LLM classification (cheap API call, 300ms latency)**

- Send the draft text to a small/fast model (e.g., `gpt-4o-mini` or a local classifier) with a simple prompt: "Classify this text as 'chat' (a conversational message or question for an AI assistant) or 'note' (a document, essay, list, or long-form written content). Return only 'chat' or 'note'."
- Cache the result per draft hash so repeated keystrokes don't re-trigger the call.
- Fall back to Tier 1 if the API is unreachable or the response is malformed.

**Client**:

- `useComposeClassifier(draft: string)` — a hook returning `{ kind: 'chat' | 'note', confidence?: number }`. Tier 1 returns instantly with 100% confidence. Tier 2 returns with a debounced API call.
- `Composer` — consumes the hook. Submit button label and action adapt to `kind`. Long-press handler shows the override buttons.
- Remove `ComposeKindSheet` (from Stage 1) — no longer needed.

**API** (Tier 2 only):

- `POST /api/classify` — body: `{ text: string }`. Returns `{ kind: 'chat' | 'note', confidence: number }`. Stateless, no auth needed beyond the existing session. Rate-limited to prevent abuse.

### What does NOT change

- `useCreateChat` / `useCreateNote` — same hooks, same endpoints. Only the invocation path changes.
- The merged inbox — items appear the same regardless of how the kind was decided.
- Detail screens — unchanged.

## Risks

- **Wrong classification**: the system picks chat when the user meant note (or vice versa). Mitigation: the long-press override is always available. If the override rate exceeds ~15% in analytics, the classifier needs tuning or should be abandoned in favor of the Stage 1 bottom sheet.
- **Button label flicker**: debouncing the classification prevents label thrashing, but transitions between "Send message" and "Save note" should be animated smoothly. Mitigation: `LayoutAnimation.configureNext` on the button width change if it's jarring.
- **LLM latency (Tier 2)**: a 300ms round trip on every keystroke is unacceptable. Mitigation: aggressive debounce (500ms after last keystroke), cancel in-flight requests on new input, and always show the Tier 1 result immediately while Tier 2 resolves in the background. If Tier 2 disagrees with Tier 1, transition the label.

## Revert strategy

- Remove the `useComposeClassifier` hook and hardcode `kind` — falls back to the Stage 1 bottom sheet or a static default (always chat, with a manual toggle).
- Remove the `POST /api/classify` endpoint (if Tier 2 was built).
- The long-press override can remain as a general-purpose compose-mode switcher even without classification.

## Success criteria

1. Short messages (<140 chars, interrogative) default to chat. Long messages (>200 chars, declarative) default to note.
2. The submit button label changes in real time without flickering.
3. Long-press shows both options and the user can select the non-default kind.
4. Override rate is measurable (via PostHog event). Target: <10% overrides within 30 days of launch.
5. Classification latency (Tier 1) is imperceptible. Tier 2 adds <500ms to the submit flow in the worst case.
