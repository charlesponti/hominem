## 1. Route Layout Boundary

- [x] 1.1 Add a Notes chat route layout boundary that gives `chat/:chatId` its own inner width, padding, and shell integration rules
- [x] 1.2 Update shared Notes shell behavior so chat routes keep the necessary top-level context visible while preserving existing behavior for non-chat routes
- [ ] 1.3 Verify mobile tab-bar spacing, safe-area padding, and fixed-composer positioning for the chat route

## 1A. Shared Cross-Platform Contract

- [ ] 1A.1 Define shared chat presentation semantics in `packages/ui` for assistant transcript rows, user compact bubbles, and system utility rows
- [ ] 1A.2 Add or formalize shared chat-specific tokens for transcript width, turn spacing, composer structure, and chat surfaces without violating the monotone light design system
- [ ] 1A.3 Audit downstream consumers of the existing shared message and prompt primitives to identify any compatibility risks from moving away from universal bubble treatment

## 2. Chat Surface Structure

- [x] 2.1 Replace the current context strip and action band with a sticky chat-local header containing back navigation, session context, and an overflow dropdown
- [x] 2.2 Remove the persistent in-page artifact action row and move transform actions into the local header dropdown
- [x] 2.3 Keep the conversation surface single-column across breakpoints with responsive thread width and spacing rules
- [ ] 2.4 Refactor the shared web chat primitives so assistant turns render as transcript rows and user turns render as compact bubbles without nested decorative wrapper surfaces
- [ ] 2.5 Recompose the Notes web chat message and composer components around the shared transcript/composer contract instead of styling around bubble-first primitives

## 3. Search And Debug Interactions

- [x] 3.1 Refactor message search into an overlay that does not shift the thread layout and restores the prior in-page state when dismissed
- [x] 3.2 Add a `Show debug` toggle in the chat header dropdown and render deeper message metadata inline only when enabled
- [x] 3.3 Ensure search and debug mode work correctly with the existing message virtualization and streaming states
- [ ] 3.4 Align mobile search and debug behavior with the same overlay posture and inline metadata hierarchy where the platform supports those interactions

## 4. Mobile Parity

- [ ] 4.1 Rebuild the mobile chat message presentation to match the shared transcript-row and compact-bubble contract
- [ ] 4.2 Rebuild the mobile composer so it uses the same single-surface hierarchy, lightweight suggestions, and footer/tools structure as the web spec
- [ ] 4.3 Update the mobile chat screen shell so header, search, transcript spacing, and review overlays remain visually aligned with the Notes web experience while respecting native safe areas

## 5. Review Flow And Validation

- [x] 5.1 Refine the classification review overlay so it remains usable within the redesigned chat surface on mobile and desktop
- [ ] 5.2 Validate keyboard, focus, and dismissal behavior for the local header menu, search overlay, and review overlay
- [ ] 5.3 Run Notes app typecheck/build validation and manually verify responsive behavior for mobile and desktop chat sessions
- [ ] 5.4 Run mobile validation for transcript/composer parity, safe-area behavior, and search/review interactions
