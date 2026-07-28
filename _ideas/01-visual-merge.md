# Stage 1: Visual Merge

**Risk: Low** — zero backend changes, additive UI only, every change independently reversible.

## Goal

Show chats and notes in a single merged feed by default, collapsing the two tabs into filter pills and deferring the kind decision to after the user composes.

## Scope

### UX changes

1. **WorkspaceToolbar becomes All | Time**

   The current Chats | Notes | Time root tabs become All | Time. The All view renders the merged inbox — chats and notes interleaved by `updatedAt`, same sort order the API already returns.

2. **Kind filter pills live inside the All view**

   Below the toolbar, two pill buttons: `Chats` / `Notes`. Tapping one filters the feed to that kind (same client-side filter that exists today). Default is neither selected — full merged feed. This replaces the current tabs without removing the ability to filter.

3. **Compose bar becomes a single input**

   The composer always shows a single text input. No `entryMode` toggle in the bar itself. On submit, a bottom sheet appears with two options:

   - "Send as chat" (primary, default for short text)
   - "Save as note" (secondary)

   The smart default is rule-based: if the text is under 140 characters and contains no line breaks, default to chat. Otherwise default to note. The user can tap the other option or dismiss.

4. **Inbox items show kind indicator**

   Each row in the merged feed gets a small leading icon: a chat bubble for chats, a document for notes. The existing visual distinction (chats are compact with no preview, notes show a text snippet) already provides separation — the icon reinforces it. No kind label text needed.

### Technical changes

- **WorkspaceScreen**: remove `activeContentContext` state as a root tab concept. Replace with a boolean `showChatsOnly` / `showNotesOnly` filter toggle. The display filter becomes `items.filter(i => !filterActive || i.kind === activeFilter)`.
- **WorkspaceToolbar**: remove the three-segment control in favor of two plain text buttons (All | Time) with the active state styled as the current selected segment.
- **ComposerDock / Composer**: remove `entryMode` prop. On submit, show a `ComposeKindSheet` (bottom sheet) with the two options. Wire the existing `useCreateChat` and `useCreateNote` mutations behind each button.
- **InboxStreamItem / StreamItem**: add a `leading` prop for the kind icon. Map `kind` to the appropriate SF Symbol (`bubble.left` / `doc.text`). Existing `leading` support in `StreamItem` means this is a one-line prop addition.
- **InboxList**: use the unified `items` array directly instead of receiving pre-filtered items from the parent. Pass the filter pill state down.

### What does NOT change

- `GET /api/inbox` — already returns both kinds in one cursor-paginated list.
- `useInboxStreamItems` — already fetches and caches both kinds together.
- `InboxEntityMap` — already keys by `kind:id`, no change needed.
- `ChatDetailScreen` / `NoteDetailScreen` — identical, reached via the same route pattern.
- The Time workspace — unchanged.
- Per-kind scroll state, search state, empty states — preserved, just scoped to the filter pill state rather than the root tab.

## Risks

- **User habit**: existing users may rely on the Chats/Notes tab separation as primary navigation. Mitigation: the filter pills are always visible and one tap away — functionally identical to the current tabs, just one level down.
- **Compose friction**: a bottom sheet after every compose submit could feel like a speed bump. Mitigation: the smart default means most users just tap the primary button. If the sheet proves annoying in testing, the auto-classification from Stage 3 can replace it.
- **Empty state**: the `EMPTY_STATE_ASSETS` currently shows different illustrations for chats vs notes. In the All view, show a unified empty state (new illustration). When a filter pill is active, show the per-kind empty state.

## Revert strategy

Each change is an independent toggle behind a feature flag or a simple code revert:

- **All tab**: if the merged feed is disorienting, kill it and keep Chats | Notes as root tabs. The filter pills survive as an optional secondary control.
- **Filter pills**: revert to the current two-tab toolbar if pills don't test well. Zero impact on anything else.
- **Compose bottom sheet**: revert to `entryMode` toggle in the compose bar — the underlying `useCreateChat` / `useCreateNote` hooks don't change, only how they're invoked.

## Success criteria

1. The merged feed renders chats and notes interleaved by recency with correct kind icons.
2. Filter pills filter to the correct kind and show the correct empty states.
3. The compose bottom sheet creates the correct kind of content.
4. Tapping any item navigates to the correct detail screen.
5. The Time workspace is unaffected.
6. Pull-to-refresh and infinite scroll work on the merged feed.
