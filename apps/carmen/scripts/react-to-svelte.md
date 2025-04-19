# React to Svelte Conversion Guide

This guide provides a structured approach for converting React components to Svelte.

## Component Structure

### React Component
```jsx
import React, { useState, useEffect } from 'react'
import './Component.css'

function Component({ prop1, prop2 }) {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  const handleEvent = () => {
    setState(newValue)
  }
  
  return (
    <div className="container">
      <h1>{prop1}</h1>
      <p>{state}</p>
      <button onClick={handleEvent}>Click me</button>
    </div>
  )
}

export default Component
```

### Svelte Component
```svelte
<script>
  import './Component.css'
  
  // Props become exports
  export let prop1
  export let prop2
  
  // Local state
  let state = initialValue
  
  // Lifecycle (similar to useEffect)
  import { onMount, onDestroy } from 'svelte'
  
  onMount(() => {
    // Effect logic
    
    return () => {
      // Cleanup logic
    }
  })
  
  // Event handlers
  function handleEvent() {
    state = newValue
  }
</script>

<div class="container">
  <h1>{prop1}</h1>
  <p>{state}</p>
  <button on:click={handleEvent}>Click me</button>
</div>
```

## Conversion Checklist

### React Features to Svelte Equivalents

1. **Props**
   - React: `function Component({ prop1, prop2 })`
   - Svelte: `export let prop1; export let prop2`

2. **Default Props**
   - React: `Component.defaultProps = { prop1: 'default' }`
   - Svelte: `export let prop1 = 'default'`

3. **State**
   - React: `const [state, setState] = useState(initialValue)`
   - Svelte: `let state = initialValue`

4. **Updating State**
   - React: `setState(newValue)` or `setState(prev => prev + 1)`
   - Svelte: `state = newValue`

5. **Effects**
   - React: `useEffect(() => { ... }, [deps])`
   - Svelte: `onMount()`, `onDestroy()`, or `$: { ... }` reactive statements

6. **Refs**
   - React: `const ref = useRef()`
   - Svelte: `let element`

7. **Context**
   - React: `const value = useContext(Context)`
   - Svelte: Create context with `setContext`, retrieve with `getContext`

8. **Styles**
   - React: `className="my-class"` in JSX
   - Svelte: `class="my-class"` in templates

9. **Component Composition**
   - React: `{props.children}`
   - Svelte: `<slot></slot>`

10. **Conditional Rendering**
    - React: `{condition && <Component />}`
    - Svelte: `{#if condition}<Component />{/if}`

11. **Lists**
    - React: `{items.map(item => <Item key={item.id} {...item} />)}`
    - Svelte: `{#each items as item (item.id)}<Item {...item} />{/each}`

12. **Event Handling**
    - React: `onClick={handleClick}`
    - Svelte: `on:click={handleClick}`

13. **Custom Events**
    - React: Use props for callbacks
    - Svelte: `createEventDispatcher` and `on:customEvent`

14. **Forwarding Refs**
    - React: `React.forwardRef((props, ref) => ...)`
    - Svelte: `bind:this={node}`

15. **CSS Modules/Scoped CSS**
    - React: Import from external CSS modules
    - Svelte: Automatic CSS scoping with `<style></style>`

## TypeScript Support

### React
```tsx
interface Props {
  prop1: string;
  prop2?: number;
}

const Component: React.FC<Props> = ({ prop1, prop2 = 0 }) => {
  // ...
}
```

### Svelte
```svelte
<script lang="ts">
  interface Props {
    prop1: string;
    prop2?: number;
  }

  export let prop1: string;
  export let prop2: number = 0;
</script>
```

## Libraries Conversion

1. **State Management**
   - React: Redux, React Context
   - Svelte: Svelte stores, writable, readable, derived

2. **Data Fetching**
   - React: React Query, SWR
   - Svelte: @tanstack/svelte-query

3. **Routing**
   - React: React Router
   - Svelte: svelte-navigator or svelte-routing

4. **Animation**
   - React: React Spring, Framer Motion
   - Svelte: Built-in transitions/animations or svelte-motion

5. **Forms**
   - React: Formik, React Hook Form
   - Svelte: svelte-forms-lib

By following this guide, you can systematically convert your React components to Svelte while maintaining the same functionality.