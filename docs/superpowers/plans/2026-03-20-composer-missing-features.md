# Composer Missing Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining real composer attachment features for both notes and chats, including standard file uploads and device-camera capture on web.

**Architecture:** Keep attachment state in the web composer container so tool buttons, attachment display, and submit logic all share the same source of truth. Reuse the existing upload API and upload hook patterns, but make the composer own its own attachment consumption rules so notes and chats can both use the same uploaded file state without drifting into separate implementations.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Playwright, Bun, existing `useFileUpload` hook, existing `/api/upload` route.

---

## Chunk 1: Lock upload state and submit gating with tests

**Files:**
- Modify: `apps/web/app/components/composer/index.test.tsx`
- Create: `apps/web/app/components/composer/composer-attachments.test.ts`
- Reference: `apps/web/app/lib/types/upload.ts`
- Reference: `docs/superpowers/specs/2026-03-20-composer-missing-features-design.md`

- [ ] **Step 1: Write the failing composer interaction tests for uploads**

```tsx
it('starts file upload from the attachment control and renders uploaded files', async () => {
  renderComposer()
  const picker = screen.getByTestId('composer-file-input')
  fireEvent.change(picker, { target: { files: [createFile('brief.pdf', 'application/pdf')] } })
  expect(await screen.findByText('brief.pdf')).toBeInTheDocument()
})

it('disables submit while uploads are in flight', async () => {
  mockUploadAsPending()
  renderComposer()
  fireEvent.change(screen.getByTestId('composer-file-input'), {
    target: { files: [createFile('brief.pdf', 'application/pdf')] },
  })
  expect(screen.getByTestId('composer-primary')).toBeDisabled()
})
```

- [ ] **Step 2: Write the failing resolver tests for attachment consumption**

```ts
it('adds uploaded file context to reply send actions', async () => {
  const actions = resolveComposerActions({
    posture: 'reply',
    draftText: 'Question',
    uploadedFiles: [createUploadedFile({ originalName: 'brief.pdf' })],
    // remaining deps...
  })
  await actions.primary.execute()
  expect(sendMessage).toHaveBeenCalledWith({
    chatId: 'chat-1',
    message: expect.stringContaining('Attached files context:'),
  })
})
```

- [ ] **Step 3: Run the focused tests to confirm they fail**

Run:
`bun test --filter @hominem/web -- composer-attachments.test.ts index.test.tsx`

Expected: FAIL because the composer does not yet expose file inputs or attachment-aware submit behavior.

- [ ] **Step 4: Add the minimum test seams only**

Expose stable composer file-input test ids and any small helper exports needed for resolver testing, without implementing the full feature set yet.

- [ ] **Step 5: Run the focused tests again**

Run:
`bun test --filter @hominem/web -- composer-attachments.test.ts index.test.tsx`

Expected: still FAIL, but now at the intended missing behaviors.

- [ ] **Step 6: Commit the upload test harness**

```bash
git add apps/web/app/components/composer/index.test.tsx apps/web/app/components/composer/composer-attachments.test.ts
git commit -m "test(web): lock composer attachment behavior"
```

## Chunk 2: Add shared composer attachment state and input plumbing

**Files:**
- Create: `apps/web/app/components/composer/composer-attachments.ts`
- Create: `apps/web/app/components/composer/composer-attachment-list.tsx`
- Modify: `apps/web/app/components/composer/index.tsx`
- Modify: `apps/web/app/components/composer/composer-shell.tsx`
- Modify: `apps/web/app/components/composer/composer-tools.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`

- [ ] **Step 1: Write the failing attachment-list rendering test**

```tsx
it('renders uploaded files separately from attached note context', async () => {
  renderComposerWithUploads([createUploadedFile({ originalName: 'brief.pdf' })])
  expect(screen.getByText('brief.pdf')).toBeInTheDocument()
  expect(screen.queryByText('Context')).not.toBeNull()
})
```

- [ ] **Step 2: Run the focused composer test**

Run:
`bun test --filter @hominem/web -- index.test.tsx`

Expected: FAIL because the composer has no uploaded-file list or file-input plumbing.

- [ ] **Step 3: Add shared attachment state and file inputs**

```ts
export function formatUploadedFileContext(files: UploadedFile[]): string {
  return files
    .map((file) => [`Attachment: ${file.originalName}`, `Type: ${file.type}`].join('\n'))
    .join('\n\n')
}
```

Add composer-owned upload state, hidden file inputs for standard file selection and device capture, and a small uploaded-file list component with remove and error affordances.

- [ ] **Step 4: Wire the tool buttons to the hidden inputs**

Use the attachment tool for the standard file picker and the camera tool for the capture-enabled input path, while keeping both on the same upload pipeline after selection.

- [ ] **Step 5: Run the focused composer tests**

Run:
`bun test --filter @hominem/web -- composer-attachments.test.ts index.test.tsx`

Expected: PASS for rendering and input-plumbing behaviors still covered by the tests so far.

- [ ] **Step 6: Commit the shared attachment plumbing**

```bash
git add apps/web/app/components/composer/composer-attachments.ts apps/web/app/components/composer/composer-attachment-list.tsx apps/web/app/components/composer/index.tsx apps/web/app/components/composer/composer-shell.tsx apps/web/app/components/composer/composer-tools.tsx apps/web/app/components/composer/index.test.tsx apps/web/app/components/composer/composer-attachments.test.ts
git commit -m "feat(web): add composer attachment state"
```

## Chunk 3: Extend submit behavior for chats and notes

**Files:**
- Modify: `apps/web/app/components/composer/composer-actions.ts`
- Modify: `apps/web/app/components/composer/composer-actions.test.ts`
- Modify: `apps/web/app/components/composer/index.tsx`
- Test: `apps/web/app/components/composer/composer-attachments.test.ts`

- [ ] **Step 1: Write the failing chat and note attachment resolver tests**

```ts
it('persists uploaded files in note creation content', async () => {
  const actions = resolveComposerActions({
    posture: 'capture',
    draftText: 'Draft note',
    uploadedFiles: [createUploadedFile({ originalName: 'brief.pdf', url: 'https://example.test/brief.pdf' })],
    // remaining deps...
  })
  await actions.primary.execute()
  expect(createNote).toHaveBeenCalledWith({
    content: expect.stringContaining('## Attachments'),
    title: 'Draft note',
  })
})
```

- [ ] **Step 2: Run the resolver and attachment tests**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts composer-attachments.test.ts`

Expected: FAIL because attachment-aware submit formatting and cleanup are not implemented yet.

- [ ] **Step 3: Extend `resolveComposerActions` for uploads**

Update the resolver input to accept:

- uploaded files
- upload-in-progress state
- upload reset callbacks

Implement:

- chat context formatting that combines uploaded-file context with note-context blocks
- note content formatting that appends a structured attachment section
- submit gating while uploads are active
- cleanup only after successful consumption

- [ ] **Step 4: Wire the container to the resolver changes**

Feed composer upload state into the resolver and ensure note/chat actions clear uploaded files only after success.

- [ ] **Step 5: Run the focused resolver and composer tests**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts composer-attachments.test.ts index.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the attachment-aware submit behavior**

```bash
git add apps/web/app/components/composer/composer-actions.ts apps/web/app/components/composer/composer-actions.test.ts apps/web/app/components/composer/composer-attachments.test.ts apps/web/app/components/composer/index.tsx
git commit -m "feat(web): consume composer attachments in note and chat flows"
```

## Chunk 4: Harden UX edges and browser coverage

**Files:**
- Modify: `apps/web/app/components/composer/index.test.tsx`
- Modify: `apps/web/tests/assistant-lifecycle.spec.ts`
- Modify: `apps/web/tests/chat-ui.spec.ts`
- Reference: `apps/web/app/routes/api.upload.ts`

- [ ] **Step 1: Add failing browser and component assertions for the final affordances**

```tsx
it('camera control triggers the capture input path', async () => {
  renderComposer()
  fireEvent.click(screen.getByRole('button', { name: 'Take photo' }))
  expect(mockCaptureInputClick).toHaveBeenCalledTimes(1)
})
```

```ts
test('reply composer shows uploaded attachment before send', async ({ page }) => {
  // attach a file, verify it appears, then submit
})
```

- [ ] **Step 2: Run the focused component and browser tests to confirm they fail**

Run:
`bun test --filter @hominem/web -- index.test.tsx`
`bun run --filter @hominem/web test:e2e -- tests/assistant-lifecycle.spec.ts tests/chat-ui.spec.ts`

Expected: FAIL until the final attachment affordances and coverage are aligned.

- [ ] **Step 3: Implement the final UX hardening**

Ensure:

- attachment and camera controls are enabled and semantically correct
- upload errors remain visible and removable
- attachment display is clearly separate from attached-note context
- focus and submit state stay stable through upload and submit flows

- [ ] **Step 4: Run the full verification set**

Run:
`bun run --filter @hominem/web test`
`bun run --filter @hominem/web typecheck`
`bun run --filter @hominem/web test:e2e -- tests/assistant-lifecycle.spec.ts tests/chat-ui.spec.ts`
`bun run check`

Expected: PASS.

- [ ] **Step 5: Commit the missing-feature pass**

```bash
git add apps/web/app/components/composer apps/web/tests/assistant-lifecycle.spec.ts apps/web/tests/chat-ui.spec.ts docs/superpowers/specs/2026-03-20-composer-missing-features-design.md docs/superpowers/plans/2026-03-20-composer-missing-features.md
git commit -m "feat(web): build missing composer attachment features"
```
