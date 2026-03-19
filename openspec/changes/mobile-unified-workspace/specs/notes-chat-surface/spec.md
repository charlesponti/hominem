## MODIFIED Requirements

### Requirement: Notes chat SHALL render as a dedicated conversation surface
The Notes `chat/:chatId` route SHALL render on mobile as a dedicated conversation surface inside the shared workspace shell, with the shell-owned HyperForm remaining accessible as the active chat composer.

#### Scenario: Mobile chat session renders
- **WHEN** an authenticated user opens a Notes chat session on a mobile viewport
- **THEN** the page renders a dedicated chat surface with a compact local header and a scrollable conversation thread
- **AND** the shell-owned HyperForm remains accessible in chat mode above the safe area
- **AND** the chat surface reads as a focused context of the same shared workspace

#### Scenario: Desktop chat session renders
- **WHEN** an authenticated user opens a Notes chat session on a larger viewport
- **THEN** the conversation thread remains single-column and centered with a readable maximum width instead of stretching across the full app-shell content width
