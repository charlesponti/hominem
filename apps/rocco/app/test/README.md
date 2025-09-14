# Testing with React Router v7

This guide explains how to test components that use React Router v7.

## Two Testing Approaches

### 1. Direct Component Testing (Faster, Simpler)

Test components directly by providing the props they expect:

```tsx
// Direct component testing for routes
render(
  <MyComponent
    loaderData={{ items: [1, 2, 3] }}
    matches={[]}
    params={{ id: '123' }}
  />
);
```

This approach is ideal for unit testing component behavior. See [list-component.test.tsx](./list-component.test.tsx) for an example.

### 2. Router-Based Testing (More Realistic)

For complex routing tests, use a real router:

```tsx
// Router-based testing with real React Router
import { renderWithRouter } from 'app/test/utils';

const routes = [
  {
    path: '/items/:id',
    element: <ItemComponent />,
    loader: () => ({ item: { id: '123', name: 'Test Item' } }),
  },
];

renderWithRouter({
  routes,
  initialEntries: ['/items/123'],
});
```

This approach tests how the component behaves within the full router context.

## Working Test Examples

These tests are working examples of how to test with React Router v7:

* ✅ [list-component.test.tsx](./list-component.test.tsx) - List component test
* ✅ [account-component.test.tsx](./account-component.test.tsx) - Account component test
* ✅ [login-component.test.tsx](./login-component.test.tsx) - Login component test
* ✅ [place-component.test.tsx](./place-component.test.tsx) - Place component test
* ✅ [dashboard-component.test.tsx](./dashboard-component.test.tsx) - Dashboard component test

## Test Pattern

The key pattern for testing React Router v7 components:

```tsx
// Mock necessary React Router hooks (BEFORE importing the component)
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({ /* test data */ }),
    useFetcher: () => ({
      Form: ({ children }) => <form>{children}</form>,
      state: "idle",
      submit: vi.fn()
    }),
    // Add other hooks as needed
  };
});

// Import component after mocks
import MyComponent from '~/routes/my-component';

test('renders with data', async () => {
  render(
    <MyComponent
      loaderData={{ /* test data */ }}
      matches={[]}
      params={{ id: '123' }}
    />
  );
  
  // Assert component behavior
});
```

## Common Hook Mocks

### useLoaderData

```tsx
useLoaderData: () => ({ /* loader data */ }),
```

### useFetcher

```tsx
useFetcher: () => ({
  Form: ({ children }) => <form data-testid="form">{children}</form>,
  state: "idle",
  submit: vi.fn(),
}),
```

### useNavigate

```tsx
useNavigate: () => vi.fn(),
```

### Link Component

```tsx
Link: ({ to, children, ...props }) => (
  <a href={to} {...props}>{children}</a>
),
```

## Testing Forms and Actions

For testing form submissions with actions:

```tsx
const routes = [
  {
    path: '/items/new',
    element: <NewItemForm />,
    action: () => ({ success: true, id: '123' }),
  },
];

const { router } = renderWithRouter({
  routes,
  initialEntries: ['/items/new'],
});

// Fill out form
await user.type(screen.getByLabelText('Name'), 'New Item');

// Submit form
await user.click(screen.getByText('Submit'));

// Verify navigation or success state
expect(router.state.location.pathname).toBe('/items/123');
```

## Testing Utilities

We provide these utility functions:

1. `renderWithRouter`: Creates a test router with the given routes

## Best Practices

1. **Choose the right approach**: Component testing for simpler unit tests, router testing for integration tests
2. **No Router Mocking**: Don't mock the entire React Router library
3. **Mock specific hooks**: Only mock the hooks your component uses
4. **Import order matters**: Always set up mocks before importing the component
5. **Test with realistic data**: Use actual data structures in your tests
6. **Test error states**: Include tests for error responses from loaders
7. **Test interactions**: Verify user interactions that trigger navigation or form submissions

## Required Test Setup

For component tests, provide the expected props:

- `loaderData`: The data your loader would return
- `matches`: Usually an empty array in tests 
- `params`: URL parameters like `{ id: '123' }`

For router tests:

1. Define route configuration similar to your app
2. Provide loader and action functions
3. Use `initialEntries` to set the starting URL
4. Access the router object to verify navigation changes

## Common Gotchas

1. **QueryClient**: Components using React Query need a QueryClientProvider
2. **Redux Store**: Components using Redux need a store Provider
3. **Complex Hooks**: Some components use `useMatches` or other router hooks
4. **Form Handling**: Form components need proper `useFetcher` mocks

## Debugging Tips

- Check if the component properly destructures `loaderData`
- Ensure loader functions return objects in the expected shape
- Verify URL parameters match what your component expects
- Check for any React Router context dependencies

## Running Tests

For running tests during migration to React Router v7:

```bash
# Run all passing tests
pnpm test

# Run only the React Router v7 tests
pnpm test:router-v7

# Run a specific test file
pnpm test app/components/places/PlaceTypes.test.tsx
```

## References

- React Router v7 Data API: https://reactrouter.com/en/main/start/overview
- Testing Router Components: https://reactrouter.com/en/main/guides/testing