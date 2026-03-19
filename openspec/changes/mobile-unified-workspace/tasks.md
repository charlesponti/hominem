## 1. Workspace shell foundation

- [ ] 1.1 Add a mobile workspace context model for `Inbox`, `Note`, `Chat`, `Search`, and `Settings`
- [ ] 1.2 Refactor the protected mobile layout to own shared workspace state and mount points
- [ ] 1.3 Replace the current primary bottom-destination model with a top context switcher shell

## 2. Shared HyperForm

- [ ] 2.1 Expand the mobile input state contract to include draft text, attachments, voice state, and active context metadata
- [ ] 2.2 Implement one shell-mounted mobile HyperForm with context-aware placeholder, actions, and posture
- [ ] 2.3 Migrate voice and attachment flows into the shared HyperForm contract
- [ ] 2.4 Remove route-local draft ownership from `CaptureBar`, `InputDock`, and mobile chat input flows

## 3. Unified inbox and focused contexts

- [ ] 3.1 Convert the current mobile notes home into `Inbox` as the canonical chronological stream
- [ ] 3.2 Define a typed mobile stream item adapter for notes, chat activity, assistant output, and attachments
- [ ] 3.3 Reframe mobile chat as a focused `Chat` context inside the shared workspace shell
- [ ] 3.4 Add a focused `Note` context that keeps authoring distinct while preserving shared workspace continuity
- [ ] 3.5 Add a `Search` context that queries the same workspace corpus through the shared shell

## 4. State updates and regressions

- [ ] 4.1 Update React Query invalidation and optimistic behaviors so inbox reflects new notes and chat activity immediately
- [ ] 4.2 Remove or retire obsolete mobile entry surfaces that no longer fit the unified workspace model
- [ ] 4.3 Update route tests and e2e coverage for context switching, draft persistence, and single-composer behavior
