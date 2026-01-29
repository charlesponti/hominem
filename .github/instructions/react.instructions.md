---
applyTo: '**/*.{tsx,jsx}'
---

# React Component Guidelines

## Component Architecture

- Favor **React Server Components (RSC)** - minimize `use client`
- Use functional components with hooks
- Prefer composition (children prop) over inheritance
- Wrap client components in `Suspense` with fallbacks

## Hooks Best Practices

- Follow strict Rules of Hooks
- Minimize `useEffect` and `useState` - prefer derived state or React Query
- **Custom Hooks:**
  - Focus on single CRUD operations
  - Return structure: `{ data, setData, ...operations }`
  - Define query keys as constants at top-level

## Performance Optimization

- Avoid inline function definitions in JSX
- Use `React.memo` sparingly and only when profiling shows benefit
- Leverage React Server Components for better performance
- Use Suspense boundaries for code splitting

## State Management

### Global State

- Use **Zustand** for global state
- Keep stores focused and small
- Avoid storing server data in Zustand

### Server/Local-First State

- Use **React Query** combined with **IndexedDB**
- All data changes must be saved to IndexedDB and synced to API
- Use optimistic updates and invalidate queries on success
- Handle offline scenarios gracefully

### Forms

- Use **React Hook Form** with **Zod** validation
- Define validation schemas separately
- Handle errors at field level
- Use controlled components for complex interactions

## UI & Styling

### Mobile-First Approach

- Design for mobile first, enhance for larger screens
- Use responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test on various screen sizes

### CSS

- Use **Tailwind CSS** for utilities
- Use **CSS Modules** for complex, non-utility styles
- **Forbidden:** Do NOT use the `@apply` directive
- Prefer composition of utility classes

### Accessibility

- Use semantic HTML (avoid `div` soup)
  - `<button>` for actions
  - `<a>` for navigation
  - `<nav>`, `<header>`, `<footer>`, `<main>`, `<section>`, `<article>`
- Ensure ARIA attributes where needed
- Support keyboard navigation (Tab, Enter, Space, Escape)
- Provide focus indicators
- Include alt text for images
- Ensure color contrast meets WCAG standards

## Component Patterns

### Server Components (Default)

```typescript
// No 'use client' directive
export default async function ServerComponent() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Client Components

```typescript
'use client'

import { useState } from 'react'

export default function ClientComponent() {
  const [state, setState] = useState()
  return <button onClick={() => setState()}>Click</button>
}
```

### Custom Hooks

```typescript
// Define query key at top level
const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
};

export function useUser(id: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: QUERY_KEYS.user(id),
    queryFn: () => fetchUser(id),
  });

  const updateUser = useMutation({
    mutationFn: (updates: Partial<User>) => updateUserApi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user(id) });
    },
  });

  return {
    data,
    error,
    isLoading,
    updateUser: updateUser.mutate,
  };
}
```

## Error Handling in Components

- Use error boundaries for runtime errors
- Display user-friendly error messages
- Provide fallback UI for failed states
- Log errors for debugging

## Testing React Components

- Use Vitest + React Testing Library
- Test user interactions, not implementation details
- Use `screen.getByRole` for accessibility-focused queries
- Mock external dependencies (API calls, etc.)
