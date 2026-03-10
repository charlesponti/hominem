## ADDED Requirements

### Requirement: App uses @tanstack/start for routing
The notes app SHALL configure its routes using `@tanstack/start` conventions and APIs

#### Scenario: Route definitions load correctly
- **WHEN** the app starts in the browser
- **THEN** the route configuration from `src/routes.tsx` is applied and the corresponding page component renders

### Requirement: Navigation uses start-provided link component
Navigation elements SHALL use `<Link>` or `<Navigate>` from `@tanstack/start` instead of `react-router` links

#### Scenario: Click a link navigates
- **WHEN** user clicks a link rendered by `<Link>`
- **THEN** the URL updates and the target component is displayed without full page reload

### Requirement: Nested layouts supported
The routing setup SHALL support nested layout components as defined by start's file-based routing (e.g., `layout.tsx` files)

#### Scenario: Nested layout renders shared UI
- **WHEN** user navigates to a child route within a layout
- **THEN** the layout's shared UI (header/sidebar) remains visible

