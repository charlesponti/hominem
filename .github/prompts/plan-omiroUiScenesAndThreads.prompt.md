## Plan: Omiro UI, Scenes, and Threads

Build a portable local-development workflow for `@ponti-studios/ui`, establish a native component and motion lab, centralize motion contracts, and evolve Omiro to the approved `All + Time` root experience. Expo Router remains the sole route/history authority; root switching uses a bounded app-owned edge gesture that commits a normal route replacement only after the threshold. “Thread” is a presentation-only discriminated model over existing chat/note APIs and tables: creation infers chat versus note with a visible override, and the persisted kind locks after creation. Native Apple zoom is an optional alpha enhancement gated by a simulator proof and a standard Stack fallback.

**Steps**

### Phase 0 — Stabilize package resolution

1. Restore `@ponti-studios/ui` to `catalog:` in the root, Career, Finance, and Omiro manifests. Keep version `1.1.0` in `pnpm-workspace.yaml`, and regenerate `pnpm-lock.yaml` with registry resolution. Replace the current direct `link:` edits; they are temporary local state, not the committed design.
2. Add `just ui link [path]`, `just ui unlink`, and `just ui status`, routed through the repository command interface. Link defaults to the sibling UI repository, validates its package name, and applies `pnpm link <dir>` to every real consumer without editing manifests or lockfile. Unlink restores frozen registry resolution. Status reports each consumer’s actual resolved target and rejects mixed local/registry copies. Support an argument or `UI_REPO_PATH`; never commit a home-directory path.
3. Prove link → source edit visible in Metro → unlink. A full cycle must restore registry `1.1.0` and leave no manifest/lock diff.

### Phase 1 — Define portable motion ownership

4. In `/Users/charlesponti/Developer/ui`, add platform-neutral semantic duration, easing, spring, distance, opacity, interruption, and reduced-motion contracts. Generate artifacts through the existing DTCG/Style Dictionary flow. Export serializable values from `@ponti-studios/ui/tokens` and `@ponti-studios/ui/native`; keep Expo Router, Reanimated objects, routes, and product semantics out.
5. Add UI-package tests for deterministic token generation, public exports, component states, interruption, and reduced motion. Existing Storybook, Vitest browser, Playwright, a11y, typecheck, lint, format, token, and prepack lanes remain release gates.
6. Add one Omiro adapter that maps portable contracts to Reanimated 4 and the existing reduced-motion hook. Replace scattered constants only when they represent the same semantic behavior; native controls keep system motion.

### Phase 2 — Build the native UI and motion lab _(depends on Phase 1; UI fixtures and Omiro adapter can proceed in parallel)_

7. Add a development-only protected `dev/ui-lab` route, accessible by direct route and a development-only Settings entry, never as a root product destination. Build deterministic sections for tokens, typography, surfaces, controls, rows, composers, feedback, gestures, transitions, and reduced motion, with stable `testID`s and light/dark, Dynamic Type, smallest-iPhone, and long-content cases.
8. Keep domain-free fixtures in the UI repository; keep Router, safe-area, keyboard, deep-link, and scene composition fixtures in Omiro. Add a scene lab for enter/exit, interruption, cancellation, rapid input, keyboard, gesture conflict, background/foreground, and Reduce Motion. Do not add on-device Storybook or another navigator unless this route proves insufficient.
9. Require simulator composition proof before promoting a primitive: isolated rendering is insufficient until full header/content/composer compositions fit the smallest supported viewport.

### Phase 3 — Prove the root scene architecture _(depends on Phase 2; blocks production IA)_

10. Spike `All ↔ Time` over existing routes. `index` remains All; `/time` remains Time; nested stacks remain Router-owned. Add `RootSceneGesture` around root screens; it owns only transient drag progress. Active scene is derived from pathname.
11. Recognize right-edge drag from All and left-edge drag from Time with edge origin, horizontal-intent, distance/velocity, cancellation, and interruption rules. Reveal a deterministic noninteractive adjacent-scene preview/background during drag. On commit, finish the app-owned exit and call `router.replace()`; never mount a second live route tree, custom stack, or independent scene index.
12. Root gestures lose to native back/dismiss, modal/sheet, text selection, keyboard interaction, horizontal child controls, and accessibility actions. Vertical intent preserves scrolling. Disable on details and while navigation settles. Header menu direct jumps remain required.
13. Gate promotion on Maestro proof of entry, drag, cancel, distance/velocity commit, rapid reversal, return, keyboard, nested scroll, modal, VoiceOver, Reduce Motion, and frame behavior. If ownership or fit is ambiguous, retain header navigation and stop the gesture in the lab; do not adopt internal Reanimated screen-transition APIs or a custom navigator.

### Phase 4 — Adopt `All + Time` _(depends on Phase 3 passing)_

14. Make the existing merged inbox stream the canonical All surface and remove Home/Inbox composition duplication only after parity. Keep Tasks contextual; preserve settings, onboarding, unscheduled, and detail ownership.
15. Update `NavDrawerMenuButton` active mapping/actions to All and Time using route builders. Root scene switches use replace; detail entry uses push; native back behavior remains intact.
16. Preserve `/(protected)/inbox/[kind]/[id]`: `kind` is required by unchanged persistence. Add presentation naming such as `getThreadRoute(kind, id)` as an alias, not a kindless namespace. Translate legacy Home/Inbox links to All in `+native-intent.ts`, with cold-launch and auth tests. Keep redirects at least one shipped release.

### Phase 5 — Add presentation-only thread semantics _(can begin after Phase 1; product integration depends on Phase 4)_

17. Add a discriminated `ThreadViewModel` with common display/route fields and chat/note variants. Map merged `InboxOutput` in one pure adapter. Chat delegates to existing chat hooks/query keys/mutations; note delegates to existing note hooks/editor/mutations. Do not add kindless `useThread(id)`.
18. Evolve `InboxStreamItem` into `ThreadStreamItem`, preserving variant actions and accessibility. Consolidate common loading/error/header/attachment/navigation/composer composition in `ThreadDetailScreen`, while retaining thin chat/note controllers where behavior genuinely differs.
19. Mode adapts to persisted kind: chat-backed is Conversation; note-backed is Document. Kind locks after creation. No conversion, linked pair, ephemeral secondary mode, or hidden dual-write.
20. Explicitly make no changes to `packages/db`, `services/api`, `packages/rpc`, migrations, durable query-key identities, or backfill/dual-run logic.

### Phase 6 — Add inferred creation with visible override _(depends on Phase 5)_

21. Add a Conversation/Document segmented control to the All composer with stable test IDs. Infer Document for multiline content or heading/list/checklist syntax; infer Conversation for ordinary single-paragraph text. Inference updates only until a manual selection. Manual override is sticky for that draft and resets only on successful submit or explicit clear. No API/LLM request occurs while typing.
22. Dispatch through existing chat or note creation based on selected kind. Preserve draft recovery, attachment upload/validation, voice transcription, loading, cancellation/failure, retry, and navigation. Failure retains text, attachments, and override; success invalidates existing keys and navigates to the kind-aware route.
23. Unit-test newline, heading, bullets, numbered lists, checklists, whitespace, long unstructured prose, voice multiline, attachment-only, override stickiness, clear/reset, failure/retry, and success.

### Phase 7 — Gate native zoom _(parallel with Phases 5–6; independent promotion gate)_

24. Add a lab-only `Link.AppleZoom` proof using Expo Router 57’s public API: `Link asChild`, one native source/target child, Stack destination, and a real All row geometry. Avoid native headers in the proof. Test back/dismiss, rapid open-close-open, interruption, list recycling, and Reduce Motion. Do not import Reanimated screen-transition internals.
25. Promote only behind an Omiro-owned adapter and local kill switch if the proof passes. Standard Stack is fallback for older iOS and disabled/failed alpha behavior. Document iOS 18+, Stack-only, single-child, header glitches, alpha status, and upstream rapid-navigation latency.
26. A failed or ambiguous zoom proof blocks zoom only. All + Time and thread presentation ship with normal Stack continuity.

### Phase 8 — Document and roll out _(depends on promoted phases)_

27. Update Bible product, architecture, design, developer, and evidence docs: All + Time vocabulary; immutable persisted kind; inference/override; Router authority; adapter boundaries; gesture ownership; motion/reduced-motion rules; local link commands; zoom fallback; and target-device evidence. Keep `_ideas/05-thread-unification.md` directional and do not imply persistence unification shipped.
28. Roll out reversibly: A) link workflow/motion contracts; B) dev lab/scene proof; C) All + Time direct navigation then edge gesture; D) thread rows/detail shell; E) inferred creation; F) zoom only if separately proven. Retain prior paths until each increment’s Maestro evidence passes.
29. Remove only newly unreachable code after promotion, format both repositories, inspect final diffs, and verify no local link or generated package artifact is committed.

**Relevant files**

- `/Users/charlesponti/Developer/hominem/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `apps/{career,finance,omiro}/package.json` — portable registry/catalog resolution.
- `/Users/charlesponti/Developer/hominem/justfile`, `just/ui.just`, and `scripts/command` — public local-link workflow.
- `/Users/charlesponti/Developer/ui/src/styles/tokens/` and `/Users/charlesponti/Developer/ui/src/native/index.ts` — portable semantic motion and native exports.
- `/Users/charlesponti/Developer/hominem/apps/omiro/app/(protected)/_layout.tsx`, `index.tsx`, `time/index.tsx`, and new `dev/ui-lab.tsx` — Stack authority, root scenes, and lab.
- `/Users/charlesponti/Developer/hominem/apps/omiro/components/navigation/NavDrawerMenuButton.tsx`, `services/navigation/routes.ts`, and `app/+native-intent.ts` — direct navigation, canonical routes, compatibility.
- `/Users/charlesponti/Developer/hominem/apps/omiro/components/home/HomeScreen.tsx`, `components/inbox/InboxScreen.tsx`, `services/inbox/use-inbox-stream-items.ts`, and `components/inbox/InboxStreamItem.tsx` — All and thread mapping/presentation.
- `/Users/charlesponti/Developer/hominem/apps/omiro/components/inbox/ChatDetailScreen.tsx`, `NoteDetailScreen.tsx`, and `app/(protected)/inbox/[kind]/[id].tsx` — unified shell with variant controllers.
- `/Users/charlesponti/Developer/hominem/apps/omiro/components/composer/Composer.tsx`, `composer.types.ts`, `useComposerController.ts`, and `useComposerSubmission.ts` — inference, override, endpoint dispatch.
- `/Users/charlesponti/Developer/hominem/apps/omiro/hooks/use-reduced-motion.ts`, `tests/`, and `tests/flows/` — motion adapter inputs and proof.
- `/Users/charlesponti/Developer/hominem/docs/{product,architecture,design,developer,evidence}.md` — durable decisions.

**Verification**

1. Link/status/unlink cycle; Omiro typecheck and Metro source edit against local UI; registry `1.1.0` restored; zero manifest/lock diff.
2. UI repo: format, lint, typecheck, test, token build/check, Storybook/Playwright visual+a11y, and prepack/export inspection.
3. Omiro after each increment: `pnpm format`, `just mobile lint`, `just mobile test`, focused type/build checks, and `pnpm --filter @hominem/omiro exec expo export:embed --eager --platform ios --dev false`.
4. Route tests: All/Time mapping, legacy redirects, kind-aware detail, cold launch/auth, replace vs push, and back-stack preservation.
5. Composer tests: classifier/override matrix plus loading, failure, cancellation, retry, attachments, voice, clear, and success reset.
6. Maestro on booted iPhone 17 Pro with Java 17: visually inspect/capture All, Time, both edge drags/cancels/commits, keyboard/modal, direct jumps, both detail variants, both creation kinds, failure/retry, and return state using stable IDs.
7. Smallest viewport: light/dark, Reduce Motion, large Dynamic Type, long content, safe areas, keyboard, and both scenes with no overlap/shift.
8. Zoom-specific iOS 18+ proof: source/target, dismiss, rapid reopen, list reuse, disabled fallback, and visual comparison to normal Stack. Failure blocks zoom only.
9. Update and run all six existing Maestro flows, then the scoped Omiro test lane; record exact screenshots and flow output under the Bible’s evidence rules.

**Decisions**

- User-approved IA is `All + Time`; Tasks remain contextual.
- Root gesture is two-way edge-only, with header direct jumps.
- Expo Router Stack is the only route/history authority; no custom navigator, JS Stack migration, tabs, or independent scene index.
- Threads are presentation-only over existing chat/note persistence. Kind locks after creation.
- Creation uses deterministic structure inference plus visible sticky override.
- UI owns portable primitives/tokens/contracts; Omiro owns Router, Reanimated mapping, gestures, deep links, auth, keyboard/safe-area, and product semantics.
- Git stores registry catalog dependencies; commands manage local sibling links.
- Apple zoom is an alpha gated enhancement with standard Stack fallback.
- Omiro remains Apple-only; no Android fallback work.

**Further Considerations**

1. Installed Reanimated includes shared/screen-transition source, but only documented public APIs may be used; internal screen-transition modules are excluded.
2. Relevant Expo/EAS and Emil Kowalski guidance is applied: native Router ownership, dev-build/target-device proof, purposeful interruptible motion, reduced motion, and tactile feedback. App Clips, brownfield, DOM migration, cloud simulator, hosting, and store release are unrelated and excluded by YAGNI.
3. Compatibility-route removal and any true thread persistence model require separate user approval and a new migration plan.
