## ADDED Requirements

### Requirement: Authentication Context Provider
The system SHALL provide a React Context for authentication state that works with both mock and real auth.

#### Scenario: Context provides auth state
- **WHEN** component is wrapped with AuthContext provider
- **THEN** context provides current user, authentication status, and loading state

#### Scenario: Components consume auth state
- **WHEN** component uses useAuth hook
- **THEN** component receives current authentication state and user information

#### Scenario: Context handles auth updates
- **WHEN** authentication state changes (sign in, sign out, session expires)
- **THEN** context broadcasts update to all consuming components

#### Scenario: Auth state persists across navigation
- **WHEN** user navigates between pages after signing in
- **THEN** authentication state remains intact and user stays signed in

### Requirement: useAuth Hook
The system SHALL provide useAuth hook for accessing authentication state in components.

#### Scenario: Hook returns user object
- **WHEN** component calls useAuth hook
- **THEN** hook returns object with properties: user, isAuthenticated, isLoading, signIn, signOut

#### Scenario: Hook returns loading state during auth
- **WHEN** authentication is in progress
- **THEN** hook returns isLoading=true

#### Scenario: Hook provides signIn function
- **WHEN** component calls signIn function from hook
- **THEN** system initiates authentication flow (mock or real based on environment)

#### Scenario: Hook provides signOut function
- **WHEN** component calls signOut function from hook
- **THEN** system clears session and updates auth state

### Requirement: Protected Routes/Components
The system SHALL support protecting routes and components that require authentication.

#### Scenario: Route requires authentication
- **WHEN** unauthenticated user accesses protected route
- **THEN** system redirects to sign-in page

#### Scenario: Authenticated user accesses protected route
- **WHEN** authenticated user navigates to protected route
- **THEN** system displays route content without redirect

#### Scenario: Component conditionally renders based on auth
- **WHEN** component uses useAuth hook to check isAuthenticated
- **THEN** component can render different content for authenticated vs unauthenticated users

### Requirement: Session Persistence
The system SHALL persist authentication session so users remain signed in across browser sessions.

#### Scenario: Mock session persists in localStorage
- **WHEN** user signs in with mock auth
- **THEN** system stores session token in localStorage

#### Scenario: Session survives page reload
- **WHEN** user reloads page after signing in
- **THEN** system restores authentication state from storage without re-authentication

#### Scenario: Session can be cleared
- **WHEN** user signs out
- **THEN** system removes session from storage
