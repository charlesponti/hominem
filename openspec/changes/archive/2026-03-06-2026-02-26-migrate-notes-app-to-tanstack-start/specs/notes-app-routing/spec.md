## ADDED Requirements

### Requirement: Existing notes routes preserved
All current routes in the notes app (home, note detail, create, etc.) SHALL continue to function after migration

#### Scenario: Home route displays notes list
- **WHEN** user navigates to `/` or `/notes`
- **THEN** the list of notes is shown

#### Scenario: Note detail route loads note
- **WHEN** user navigates to `/notes/:id` with a valid note ID
- **THEN** the corresponding note detail page shows that note's content

### Requirement: Redirects handled by start's conventions
Any route redirects (e.g., old `react-router` `<Redirect>`) SHALL be reimplemented using `@tanstack/start` redirect patterns

#### Scenario: Old path redirects to new
- **WHEN** user hits an old URL that previously redirected (e.g. `/notes/new` -> `/notes/create`)
- **THEN** start issues a 301/302 as appropriate and user lands on the target page

