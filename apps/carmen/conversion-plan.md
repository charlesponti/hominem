# React to Svelte Conversion Plan

## Current Progress
- Main App structure converted to Svelte (App.svelte)
- Some route components already in Svelte format (Home.svelte, Login.svelte, etc.)
- First few components converted:
  - AppLink
  - Lists
  - ListForm
  - ListItem
  - ListMenu

## Remaining Components to Convert
1. UI Components:
   - Button
   - Dialog
   - Dropdown-menu
   - Popover
   - Sheet
   - Command

2. Feature Components:
   - AuthenticationWrap
   - BookmarkForm
   - BookmarkListItem
   - Footer
   - Form
   - Header
   - IdeaForm
   - IdeaListItem
   - InviteListItem
   - ListDeleteButton
   - ListInviteForm
   - ListInviteItem
   - Map
   - Modal
   - PlaceItem
   - PlacesAutocomplete
   - Toast
   - Places/* components

3. Utility Files:
   - Convert React hooks to Svelte stores
   - Update API client for Svelte Query

## Step-by-Step Implementation
1. Convert UI components (as they are used by multiple feature components)
2. Convert feature components
3. Update layout and route components
4. Test and fix issues

## Approach for Each Component
1. Create new .svelte file alongside existing .tsx file
2. Convert:
   - Props to exports
   - useState/useEffect to reactive declarations
   - Event handlers to Svelte events
   - JSX to Svelte template
   - CSS classes (className to class)
3. Update imports in components that use the converted component
4. Test the converted component
5. Remove the original .tsx file once confirmed working

## Migration Testing
1. Run the application with each set of converted components
2. Verify functionality works as expected
3. Check for console errors
4. Test all routes and functionality

## Final Steps
1. Remove React dependencies from package.json
2. Clean up any unused imports or files
3. Update build and test configurations
4. Complete end-to-end testing