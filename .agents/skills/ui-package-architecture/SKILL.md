# UI Package Architecture Skill

## Rule: Presentational Layer Only

`packages/ui` must remain environment-agnostic and business-logic-free. It is a shared component library that should work in any context (web, mobile, Storybook) without knowing about specific data sources or routing.

## Architecture Principles

### 1. Separation of Concerns
- **UI Components**: Visual presentation, interactions, styling
- **Container Components** (in apps/): Data fetching, routing, business logic
- **Feature Hooks** (in packages/): Reusable business logic for specific domains

### 2. Component Types

#### Presentational Components (packages/ui)
- Receive data via props
- Emit events via callbacks
- No side effects (no API calls, no navigation)
- Environment-agnostic (works in web, mobile, Storybook)
- Pure rendering logic

#### Container Components (apps/)
- Connect to data sources
- Handle routing and navigation
- Orchestrate multiple UI components
- Pass computed data and callbacks to UI components

## Checklist When Modifying packages/ui

- [ ] No imports from `@hominem/auth`, `@hominem/rpc`, or `@hominem/db`
- [ ] No `useNavigate`, `useSearchParams`, or other routing hooks
- [ ] No direct API calls or fetch logic
- [ ] Props accept data, components don't fetch it
- [ ] Works in Storybook without mock providers for data
- [ ] No environment-specific code (`import.meta.env`, `process.env`)
- [ ] No `console.log` statements (use proper logging if needed)

## Hook Location Rules

| Hook Type | Location | Examples |
|-----------|----------|----------|
| Pure UI | `packages/ui/src/hooks` | `useHover`, `useMediaQuery`, `useFocus` |
| Web routing | `apps/web/app/hooks` | `useComposerMode`, `useUrlFilters`, `useSort` |
| Auth | `packages/auth/src/hooks` | `usePasskeyAuth`, `useSession`, `useStepUp` |
| API client | `packages/rpc/src` | `useApiClient`, `useHonoQuery` |
| Feature-specific | `packages/<feature>/src/hooks` | `useLocationSearch` (places), `useFinanceData` |

## Component Patterns

### Good: Presentational Component
```typescript
// packages/ui/src/components/composer/composer.tsx
interface ComposerProps {
  mode: 'insert' | 'update'
  noteId?: string
  chatId?: string
  onSubmit: (data: ComposerData) => void
  onCancel?: () => void
  initialValue?: string
}

export function Composer({ 
  mode, 
  noteId, 
  chatId, 
  onSubmit, 
  onCancel,
  initialValue 
}: ComposerProps) {
  // Pure UI logic only
  const [content, setContent] = useState(initialValue || '')
  
  return (
    <form onSubmit={() => onSubmit({ content, noteId, chatId })}>
      {/* ... */}
    </form>
  )
}
```

### Bad: Component with Business Logic
```typescript
// ❌ Wrong - This belongs in apps/web/components/
const Composer = () => {
  const { mode, noteId } = useComposerMode() // ❌ Wrong - routing hook
  const navigate = useNavigate() // ❌ Wrong - routing
  const { mutate } = useCreateNote() // ❌ Wrong - API call
  
  const handleSubmit = async (data) => {
    await mutate(data) // ❌ Wrong - business logic
    navigate('/notes') // ❌ Wrong - navigation
  }
  // ...
}
```

## Composer Pattern (Container → Presentational)

The canonical example of proper separation:

### Container (apps/web)
```typescript
// apps/web/app/routes/layout.tsx
import { useComposerMode } from '~/hooks/use-composer-mode'
import { Composer } from '@hominem/ui/composer'

export function Layout() {
  const composerMode = useComposerMode() // Computes mode from URL
  
  return (
    <Composer 
      {...composerMode}
      onSubmit={handleSubmit}
    />
  )
}
```

### Presentational (packages/ui)
```typescript
// packages/ui/src/components/composer/composer.tsx
interface ComposerProps {
  mode: 'insert' | 'update'
  noteId?: string
  chatId?: string
  // ...other props
}

export function Composer({ mode, noteId, chatId }: ComposerProps) {
  // Render based on props, no routing logic
}
```

## Migration Path

When finding business logic in `packages/ui`:

1. **Identify the hook** - Is it web-specific? Move to `apps/web`. Is it auth? Move to `packages/auth`. Is it generic data fetching? Move to `packages/rpc`.

2. **Refactor the component** - Convert from internal state/props mix to pure props-based:
   - Remove internal hook calls
   - Add props for all data the hook provided
   - Add callback props for all actions

3. **Update container** - In `apps/`, import the hook and pass data to the component:
   ```typescript
   // Before
   <Composer /> // Component used internal useComposerMode
   
   // After
   const mode = useComposerMode()
   <Composer {...mode} onSubmit={handleSubmit} />
   ```

4. **Update tests** - Component tests should use props, not mocks

5. **Validate** - Run `bun run validate-db-imports` and `bun run check`

## Environment Variable Access

When code in `packages/ui` needs configuration that might come from environment variables, accept it as a prop or use a provider pattern:

```typescript
// ✅ Good: Config via props
interface ApiClientConfig {
  baseUrl: string
}

// ✅ Good: Config via provider
interface UiConfigProviderProps {
  apiBaseUrl: string
  theme: Theme
  children: React.ReactNode
}
```

The container in `apps/` handles environment-specific resolution:

```typescript
// apps/web/app/providers.tsx
const apiUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  process.env.VITE_API_URL ||
  'http://localhost:3000'

<UiConfigProvider apiBaseUrl={apiUrl}>
  <App />
</UiConfigProvider>
```

## Common Violations to Avoid

1. **Importing auth hooks in UI components**
   ```typescript
   // ❌ Wrong
   import { useSession } from '@hominem/auth'
   ```

2. **Using navigation hooks**
   ```typescript
   // ❌ Wrong
   import { useNavigate } from 'react-router'
   ```

3. **Direct API mutations**
   ```typescript
   // ❌ Wrong
   import { useMutation } from '@hominem/rpc'
   ```

4. **Environment-specific code**
   ```typescript
   // ❌ Wrong
   const apiUrl = import.meta.env.VITE_API_URL
   ```

5. **Console statements**
   ```typescript
   // ❌ Wrong - use proper logging
   console.log('Debug:', data)
   ```

## When to Break These Rules

Rare exceptions (requires explicit approval):
- Utility hooks that wrap browser APIs (`useMediaQuery`, `useLocalStorage`)
- Design system tokens that need runtime values
- Feature flags that are truly cross-cutting

## Testing Guidelines

UI components in `packages/ui` should be testable without:
- Mocking router providers
- Mocking API clients
- Mocking auth contexts

Test with props:
```typescript
// ✅ Good
render(<Composer mode="insert" onSubmit={mockSubmit} />)

// ❌ Wrong - requires complex mocks
render(
  <RouterProvider>
    <QueryClientProvider>
      <Composer />
    </QueryClientProvider>
  </RouterProvider>
)
```

## Practical Lessons Learned

### 1. Refactoring Raw Fetch to TanStack Query

When converting components from raw `fetch` to TanStack Query:

**Step 1: Create the mutation hook in apps/web**
```typescript
// apps/web/app/hooks/use-transcribe.ts
export function useTranscribe() {
  return useMutation<TranscribeResult, Error, TranscribeVariables>({
    mutationFn: async ({ audioBlob }) => {
      // fetch logic here
    },
  });
}
```

**Step 2: Update the component to accept mutation as prop**
```typescript
// packages/ui/src/components/chat/chat-voice-modal.tsx
interface ChatVoiceModalProps {
  transcribeMutation: UseMutationResult<TranscribeResult, Error, TranscribeVariables>
}

export function ChatVoiceModal({ transcribeMutation }: ChatVoiceModalProps) {
  const { mutateAsync, error } = transcribeMutation
  // Use mutateAsync instead of raw fetch
}
```

**Step 3: Update container to provide the mutation**
```typescript
// apps/web/app/routes/layout.tsx
const transcribeMutation = useTranscribe()
return <ChatVoiceModal transcribeMutation={transcribeMutation} />
```

### 2. Handling Optional Props with exactOptionalPropertyTypes

TypeScript with `exactOptionalPropertyTypes: true` requires explicit `undefined` in optional prop types:

```typescript
// ❌ Wrong - causes type error when passing undefined
interface Props {
  data?: string  // Type: string | undefined, but can't pass undefined explicitly
}

// ✅ Correct - allows explicit undefined
interface Props {
  data?: string | undefined
}
```

When passing possibly-undefined data from a query:
```typescript
// Container
const { data } = useQuery(...)
return <Component data={data ?? undefined} />  // Explicit undefined fallback
```

### 3. Console Statement Cleanup Patterns

Different contexts require different approaches:

**In UI Components (packages/ui)**
```typescript
// ❌ Wrong
} catch (error) {
  console.error('Failed:', error)
}

// ✅ Correct - let caller handle errors
} catch {
  // Error handling is the responsibility of the caller
}
```

**In Server Routes (apps/web/app/routes)**
```typescript
// ❌ Wrong
} catch (error) {
  console.error('Upload error:', error)
}

// ✅ Correct - use proper logger
import { logger } from '@hominem/utils/logger'

} catch (error) {
  logger.error('Upload error', error instanceof Error ? error : undefined)
}
```

**In Error Callbacks**
```typescript
// ✅ Acceptable - minimal comment
} catch {
  // Error state is handled via mutation error property
}
```

### 4. Environment Variable Access Pattern

For cross-platform compatibility (Vite, Bun, Node):

```typescript
// packages/ui - Never access env directly
interface ApiClientProps {
  apiBaseUrl: string  // Passed from container
}

// apps/web - Resolve in container
const apiUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  process.env.VITE_API_URL ||
  'http://localhost:3000'

<UiComponent apiBaseUrl={apiUrl} />
```

### 5. When NOT to Consolidate Mobile/Web Components

Mobile and web components use incompatible rendering primitives:
- Web: React DOM + Tailwind CSS
- Mobile: React Native + StyleSheet

**Don't try to consolidate** - instead extract shared business logic:

```typescript
// Shared logic (can be in packages/ui or feature package)
export function calculateMessageActions(message: Message) {
  return {
    canEdit: message.isUser && !message.isDeleted,
    canDelete: message.isUser,
    canCopy: message.content.length > 0,
  }
}

// Web component - uses React DOM
export function ChatMessage(props: ChatMessageProps) { ... }

// Mobile component - uses React Native
export function ChatMessageMobile(props: ChatMessageProps) { ... }
```

### 6. Refactoring Checklist

Before starting a refactor:
- [ ] Identify all imports from forbidden packages (@hominem/auth, @hominem/rpc, @hominem/db)
- [ ] Identify all routing hooks (useNavigate, useSearchParams, etc.)
- [ ] Identify all environment-specific code
- [ ] Identify all console statements
- [ ] Find container components that will need updates
- [ ] Check test files for mock updates needed

After refactoring:
- [ ] Run `bun run check` to verify
- [ ] Update test mocks if component signature changed
- [ ] Verify no new console statements introduced
- [ ] Test in Storybook (for UI components)
