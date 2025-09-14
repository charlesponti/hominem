# Map Layout Component

This component provides a responsive map layout that automatically adapts to different screen sizes using Tailwind CSS breakpoints. The map is always visible, providing a consistent user experience across all devices.

## Responsive Breakpoints

The component uses Tailwind's responsive design system:

- **Default (mobile)**: `< 640px` - Stacked layout with content above, map below
- **sm**: `≥ 640px` - Small devices (phones)
- **md**: `≥ 768px` - Medium devices (tablets) - Map always visible
- **lg**: `≥ 1024px` - Large devices (laptops) - Side-by-side layout
- **xl**: `≥ 1280px` - Extra large devices (desktops)
- **2xl**: `≥ 1536px` - 2X large devices (large desktops)

## Layout Behavior

### Mobile (< 768px)
- Content takes top portion of screen
- Map takes bottom portion of screen
- Both content and map are always visible
- Responsive proportions that adapt to content

### Tablet (≥ 768px)
- Map is always visible
- Content and map are side by side
- Responsive proportions

### Desktop (≥ 1024px)
- Side-by-side layout with collapsible content panel
- Content panel can be collapsed for more map space
- Full desktop experience

## Key Features

1. **Always Visible Map**: No toggle needed - map is always accessible
2. **Responsive Layout**: Automatically adapts to screen size
3. **Content Collapsible**: Desktop users can collapse content for more map space
4. **Fullscreen Mode**: Map can be expanded to fullscreen when needed
5. **Touch Friendly**: Optimized for mobile and tablet interactions

## Key Responsive Classes Used

```tsx
// Layout
className="flex-col lg:flex-row"           // Stacked → Side-by-side
className="flex-1 lg:flex-none"           // Flexible → Fixed width

// Visibility
className="lg:hidden"                      // Hidden on desktop
className="md:hidden"                      // Hidden on tablet+
className="hidden lg:flex"                 // Hidden on mobile, shown on desktop

// Positioning
className="top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 lg:right-auto"
```

## Benefits of Always-Visible Map

1. **Better UX**: Users don't need to remember to toggle the map
2. **Consistent Interface**: Map is always available for reference
3. **No Hidden State**: Eliminates confusion about map availability
4. **Faster Access**: Users can immediately see geographic context
5. **Simplified Logic**: No complex toggle state management needed

## Benefits of Tailwind Breakpoints

1. **No JavaScript detection** - Pure CSS-based responsive design
2. **Better performance** - No window resize listeners or state updates
3. **More reliable** - Works consistently across different devices and browsers
4. **Easier maintenance** - All responsive logic is in the CSS classes
5. **Better accessibility** - Screen readers and assistive technologies work better
6. **Future-proof** - Automatically works with new device sizes

## Usage

```tsx
import { MapLayout } from '~/components/map-layout'

function MyPage() {
  return (
    <MapLayout>
      <div>Your content here</div>
    </MapLayout>
  )
}
```

The component automatically handles all responsive behavior and ensures the map is always visible without any additional configuration.
