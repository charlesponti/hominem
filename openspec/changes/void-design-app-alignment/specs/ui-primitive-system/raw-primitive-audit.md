# Raw Primitive Audit

Generated during Phase 8 implementation.

## Web / Electron Feature Code

### `<input>` — 2 files

| File | Context | Replacement |
|------|---------|-------------|
| `apps/notes/app/routes/notes/components/note-editor.tsx` | Note title input | `TextField` |
| `apps/finance/app/components/drop-zone.tsx` | Hidden file input (`type="file"`) | **Exception** — no abstraction for hidden file input; document inline |

### `<textarea>` — 2 files

| File | Context | Replacement |
|------|---------|-------------|
| `apps/notes/app/components/capture-bar.tsx` | Quick-capture textarea | `TextArea` |
| `apps/notes/app/components/chat/ChatMessage.tsx` | Edit message form | `TextArea` |

### `<select>` — 1 file

| File | Context | Replacement |
|------|---------|-------------|
| `apps/rocco/app/routes/visits.tsx` | Sort order picker | `SelectField` (via existing Radix `Select`) |

### `<button>` — 3 files with raw usage

| File | Context | Replacement |
|------|---------|-------------|
| `apps/notes/app/components/capture-bar.tsx` | Action buttons | `Button` |
| `apps/finance/app/components/drop-zone.tsx` | Dropzone trigger button | `Button` |

### `<form>` — 6 files

| File | Replacement |
|------|-------------|
| `apps/rocco/app/components/lists/list-form.tsx` | `Form` (react-hook-form FormProvider) |
| `apps/rocco/app/components/lists/sent-invite-form.tsx` | `Form` |
| `apps/rocco/app/components/places/LogVisit.tsx` | `Form` |
| `apps/notes/app/components/chat/ChatMessage.tsx` | `Form` |
| 2 others | `Form` |

### `<label>` — 6 files

Most are properly wired with `htmlFor`. Replace orphaned labels with `Field` label slot.

---

## React Native Feature Code

### `TextInput` — 7 files

- 2 wrapper components: `text-input.tsx`, `text-input-autogrow.tsx` — **these ARE the design system; allow**
- 5 feature components: `capture-bar`, `chat`, `chat-input`, `chat-message`, `input-dock` → `TextField`

### `Pressable` — 22 files

- 3 infrastructure files (error screen, account tab, root layout) — **review per case**
- 19 component files across chat, focus, capture, media, button implementations → `Button` or `IconButton`

### `TouchableOpacity` / `TouchableHighlight` — 0 files ✓

### Direct `Text` import from 'react-native' — 11 files

→ Migrate to shared `Text` / `Heading` primitives where used for body copy or headings

### `View` — 42 files (widespread)

Many are legitimate layout containers. Target: replace repeated patterns with `Stack`/`Inline`.

### `ScrollView` — 3 files

- `account` tab, `start` tab, `classification-review` → `Screen` / `Page` shell where applicable

---

## Repeated Layout Patterns (Extraction Candidates)

### `flex flex-col gap-*` — 37 occurrences, 21 files
→ Replace with `Stack` primitive

| Variant | Count |
|---------|-------|
| `flex flex-col gap-2` | 11 |
| `flex flex-col gap-4` | 8 |
| `flex flex-col gap-3` | 6 |
| `flex flex-col gap-1` | 3 |

### `flex items-center gap-*` — 90+ occurrences, 44 files
→ Replace with `Inline` primitive

| Variant | Count |
|---------|-------|
| `flex items-center gap-2` | 35+ |
| `flex items-center gap-1` | 20+ |
| `flex items-center gap-3` | 10+ |
| `flex items-center gap-4` | 5+ |

---

## Priority Replacement Order (Phase 10)

1. **`<button>` / `Pressable`** — highest frequency, most inconsistency risk (capture-bar.tsx first)
2. **`<input>` / `TextInput`** — 7 feature files; `TextField` unblocks form cleanup
3. **`<textarea>` / multiline** — 2 web files + 5 mobile feature files
4. **`flex flex-col gap-*` → `Stack`** — 37 occurrences, high leverage
5. **`flex items-center gap-*` → `Inline`** — 90+ occurrences, highest leverage
6. **`<form>` → `Form`** — 6 files
7. **`<label>` → `Field`** — 6 files
8. **Heading tags → `Heading`** — scattered
9. **Body text → `Text`** — scattered
10. **`<select>` → `SelectField`** — 1 file

---

## Legitimate Exceptions

| File | Element | Reason |
|------|---------|--------|
| `apps/finance/app/components/drop-zone.tsx` | `<input type="file">` hidden | Browser file API; no abstraction needed |
| `packages/ui/src/**` | All raw elements | Design system implementation layer; allowed |
| `apps/mobile/components/text-input.tsx` | `TextInput` | IS the design system wrapper; allowed |
| `apps/mobile/components/text-input-autogrow.tsx` | `TextInput` | IS the design system wrapper; allowed |
