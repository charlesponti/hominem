## 1. Home And Session Shell

- [ ] 1.1 Implement the canonical home/dashboard shell on mobile `focus` and the Notes home/dashboard equivalent using the parity foundation contract
- [ ] 1.2 Implement the canonical session shell on mobile `sherpa` and Notes `chat` with persistent text capture and preserved thought/session context

## 2. Voice Features

- [ ] 2.1 Implement inline voice input, transcription, interruption handling, and return-to-session behavior against the shared voice contract
- [ ] 2.2 Implement full-screen voice mode, text-to-speech, task confirmation, accessibility, and haptic behavior without breaking parity or displacing persistent text capture

## 3. Artifact Features

- [ ] 3.1 Implement compact note capture, dense artifact browsing, and selection flows inside the mirrored thought lifecycle
- [ ] 3.2 Implement AI-assisted note actions with explicit review-before-apply persistence semantics and preserved artifact lineage
      **Carry-over from `assistant-thought-lifecycle-foundation`:**
      - [ ] 3.2a Implement classification API endpoint: `POST /api/chat/:chatId/classify`
             Receives `ClassificationRequest { chatId, targetType }`, returns `ClassificationResponse`
             (see `packages/chat/src/thought-types.ts` for full contract)
      - [ ] 3.2b Implement review accept endpoint: `POST /api/review/:reviewItemId/accept`
             Receives `ReviewAcceptRequest { reviewItemId, finalTitle? }`, persists artifact, returns note ID
      - [ ] 3.2c Implement review reject endpoint: `POST /api/review/:reviewItemId/reject`
             Discards the pending `ReviewItem` without persisting
      - [ ] 3.2d Wire `onAccept` on both surfaces (mobile `chat.tsx`, Notes `chat.$chatId.tsx`):
             call accept endpoint → transition `reviewing_changes → persisting → idle`
      - [ ] 3.2e Update `ContextAnchor` on both surfaces after persist succeeds:
             source transitions to `{ kind: 'artifact', id: <noteId>, type: 'note', title }`,
             replacing the `{ kind: 'new' }` or original thought source

## 4. Verification

- [ ] 4.1 Verify parity, persistence, accessibility, performance, and persistent text capture across the mobile app and Notes app
- [ ] 4.2 Add end-to-end coverage for home, session, voice, and AI artifact action flows
      **Carry-over from `assistant-thought-lifecycle-foundation`:**
      - [ ] 4.2a E2E: mobile `focus → sherpa` critical path (Detox)
      - [ ] 4.2b E2E: Notes `HomeView → chat.$chatId` critical path (Playwright)
      - [ ] 4.2c Gate: confirm both surfaces pass before marking lifecycle change complete
