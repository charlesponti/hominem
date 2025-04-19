# Carmen App: React to Svelte Conversion Guide

This document outlines the specific steps needed to convert the Carmen app from React to Svelte.

## Conversion Progress

The following components have been converted:
- AppLink
- ListForm
- Lists
- ListItem
- ListMenu
- Button (UI component)

## Component Structure

### Carmen App Structure
- Main app component: `App.svelte`
- Routes in `/routes/*.svelte`
- Components in `/components/**/*.svelte`
- UI components in `/components/ui/*.svelte`

## Conversion Steps

1. **Update each component file**:
   - Create a new `.svelte` file alongside the `.tsx` file
   - Convert the React component to Svelte format
   - Update imports in other components

2. **Convert the following UI components first**:
   - ✅ Button (converted)
   - Dialog
   - Sheet
   - Command
   - Popover
   - Dropdown-menu

3. **Convert feature components**:
   - ✅ ListForm (converted)
   - ✅ Lists (converted)
   - ✅ ListItem (converted)
   - ✅ ListMenu (converted)
   - BookmarkForm
   - BookmarkListItem
   - Modal
   - Form
   - Map
   - PlacesAutocomplete
   - Other components in `/components/`

4. **State management conversion**:
   - Replace React Query with Svelte Query
   - Replace React context with Svelte stores
   - Update Clerk authentication to work with Svelte

## Common Conversion Patterns

### React useState to Svelte reactive variables

```jsx
// React
const [value, setValue] = useState(initialValue)
```

```svelte
<!-- Svelte -->
<script>
  let value = initialValue
</script>
```

### React useEffect to Svelte lifecycle and reactivity

```jsx
// React
useEffect(() => {
  // Effect code
  return () => {
    // Cleanup code
  }
}, [dependency])
```

```svelte
<!-- Svelte -->
<script>
  import { onMount, onDestroy } from 'svelte'
  
  onMount(() => {
    // Effect code
    return () => {
      // Cleanup code 
    }
  })
  
  // Or use reactive statements
  $: if (dependency) {
    // Effect code
  }
</script>
```

### React components with children to Svelte slots

```jsx
// React
function Layout({ children }) {
  return <div className="layout">{children}</div>
}
```

```svelte
<!-- Svelte -->
<div class="layout">
  <slot></slot>
</div>
```

### React event handlers to Svelte events

```jsx
// React
function handleClick() {
  // Handler code
}

return <button onClick={handleClick}>Click me</button>
```

```svelte
<!-- Svelte -->
<script>
  function handleClick() {
    // Handler code
  }
</script>

<button on:click={handleClick}>Click me</button>
```

## Useful Tips

1. **Component dependencies**: When converting a component, also check which other components import it and update those imports

2. **Testing**: When a component is converted, update or rewrite its tests

3. **Props and types**: Convert React prop types to Svelte prop exports with TypeScript annotations

4. **Class names**: Change `className` to `class` in all components

5. **Conditional rendering**: 
   - React: `{condition && <Component />}`
   - Svelte: `{#if condition}<Component />{/if}`

6. **List rendering**:
   - React: `{items.map(item => <Item key={item.id} {...item} />)}`
   - Svelte: `{#each items as item (item.id)}<Item {...item} />{/each}`

## Final Steps

Once all components are converted:

1. Update the main entry point (`main.ts`)
2. Remove unused React dependencies
3. Run full test suite
4. Deploy and test in development environment