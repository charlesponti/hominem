# Rocco App - UI Capabilities Analysis

> Document created for redesign planning. This analysis catalogs all user-facing features and capabilities in the Rocco application.

---

## Overview

**Purpose**: Place discovery, list management, and visit tracking with collaborative features

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page / Home - Search places, nearby places, recent lists |
| `/about` | Public marketing about page |
| `/account` | User account management - profile, membership date, delete account |
| `/invites` | View and accept list invitations |
| `/visits` | Personal visit history with filtering |
| `/lists` | All user lists (index) |
| `/lists/:id` | Single list detail view with places and map |
| `/lists/:id/invites` | Manage invites for a specific list |
| `/lists/:id/invites/sent` | View sent invitations |
| `/places/:id` | Place detail page |
| `/admin` | Admin maintenance (admin only) |

---

## Navigation

- **Explore** - Home/search
- **Lists** - List management
- **Invites** - Invitation management

---

## Feature Deep Dive

### 1. Place Discovery & Search

#### Google Places Autocomplete Search
- Search input with debounced queries (300ms)
- Location-aware results using user's geolocation
- Keyboard navigation (Arrow Up/Down, Enter to select, Escape to close)
- Dropdown with results showing:
  - Place name
  - Address
  - Loading states with skeleton UI
  - Empty state for no results
- Click outside to close
- View transitions for smooth navigation

#### Nearby Places Discovery
- Uses user's geolocation or provided coordinates
- Configurable radius (default 5km)
- Shows places from user's lists near a location
- Displays:
  - Place name
  - Distance (in meters/km)
  - List count (how many lists contain the place)
- Default fallback: San Francisco
- Error handling for geolocation failures
- Empty state when no places found within radius

---

### 2. Place Detail Page (`/places/:id`)

#### Photo Gallery
- Horizontal scrollable photo strip
- Snap scrolling for mobile
- Responsive sizing (85vw mobile, 350px desktop max)
- Lazy loading for images after first
- Error handling for failed images
- Click to open **lightbox** for full-size viewing
- View transition animations

#### Place Information
- **Name** - Large page title
- **Business Status** - Open/closed status
- **Operating Hours** - Current hours display
- **Place Types** - Categories (restaurant, cafe, etc.)
- **Address** - Full address with click-to-directions to Google Maps
- **Website** - External link to official website
- **Phone** - Click-to-call functionality
- **Rating** - Google rating display (stars)

#### Map Integration
- Embedded Google Maps iframe
- Shows place location
- Zoom level 15
- Lazy loaded for performance

#### Nearby Places
- Shows other places within 5km radius
- Links to other place detail pages

---

### 3. List Management

#### List Creation
- Inline form with "New List" button
- Draft saved to localStorage for unauthenticated users
- OAuth redirect for unauthenticated users
- Success state with animation
- Form states: idle, open, submitting, success

#### List Display (`/lists`)
- Card/list view of all user lists
- Shows:
  - List name
  - Place count
  - Thumbnail (first place photo or placeholder)
- View transition animations
- Empty state when no lists

#### List Detail (`/lists/:id`)
- Split view:
  - Left: Places list
  - Right: Interactive map
- **Map Features**:
  - Shows all places in list as markers
  - User's current location
  - Click marker to highlight in list
  - Hover interaction between map and list
- **Places List**:
  - Add new place button (opens drawer)
  - Remove place action
  - Edit/add to other lists
  - Empty state

#### List Editing
- Dialog for editing list:
  - Name input
  - Description textarea
  - Delete list (with confirmation)
- Changes saved via mutation

---

### 4. Visit Tracking

#### Log Visit Form
- Fields:
  - **Title** (required) - e.g., "Dinner at..."
  - **Date** (required) - Date picker, defaults to today
  - **Description** - Optional text
  - **Rating** - 1-5 star buttons
  - **People** - Multi-select with create new
  - **Notes** - Private notes
  - **Review** - Public review text
- Inline form on place page
- Success/error handling

#### Visit History
- Chronological list of visits to a place
- Shows:
  - Date
  - Title
  - Rating (if given)
  - Description/notes/review (if given)
  - People who attended
- **Actions**:
  - Edit visit (inline form)
  - Delete visit (with confirmation)
- Empty state when no visits

#### Visit Filtering (`/visits`)
- Filter by place name (text search)
- Filter by date range (start/end date)
- Sort by newest/oldest
- Link to place detail page

---

### 5. Collaboration & Sharing

#### Send Invitations (`/lists/:id/invites`)
- Email input form
- Send invitation button
- Error handling for failed sends

#### Sent Invites Management
- List of sent invitations
- Shows:
  - Invited email
  - Status (pending/accepted)
- **Actions**:
  - Delete invite (revoke)
- Optimistic UI updates

#### Receive Invitations (`/invites`)
- List of received invitations
- Shows:
  - List name
  - Cover photo (if available)
  - First item in list
  - Invited email
- **Accept Flow**:
  - Sign in prompt for unauthenticated users
  - Accept button for authenticated users
  - OAuth (Apple) authentication
- **Preview Mode**:
  - Shows list preview even without auth
  - Deep link with token for accurate preview
- **Email Mismatch Handling**:
  - Warns if invited email differs from signed-in email

#### Invitation Token System
- Unique tokens for secure invitation acceptance
- URL-based token passing
- Server-side validation

---

### 6. User Account (`/account`)

#### Profile Display
- User avatar (or fallback icon)
- User name
- Email address
- Member since date (calculated)

#### Account Actions
- Delete account (with form confirmation)

---

### 7. People Management

#### People Multi-Select Component
- Search/filter people
- Create new people inline
- Shows selected people as badges
- Remove by clicking badge X
- Drawer-based UI for mobile
- Syncs with visit logging

---

### 8. Admin Features (`/admin`)

- Refresh Google Maps Places data
- Admin-only access control
- Shows refresh results (count, duration, errors)

---

### 9. Authentication

#### Methods
- OAuth (Apple)
- Email magic link

#### Auth Flow
- Unauthenticated users see:
  - Sign-in prompts
  - Draft saving to localStorage
- Redirect after auth with `next` parameter

---

### 10. UI/UX Patterns Used

- **View Transitions** - Smooth page navigation
- **Optimistic Updates** - Immediate UI feedback
- **Skeleton Loading** - Placeholder during load
- **Empty States** - Guidance when no data
- **Error Handling** - User-friendly error messages
- **Form Validation** - Required field enforcement
- **Keyboard Navigation** - Accessibility support
- **Responsive Design** - Mobile-first approach

---

### 11. Map Interactions

- **Map-List Sync**:
  - Hover on list item → highlight marker
  - Hover on marker → highlight list item
- **Lazy Loading** - Map loads when needed
- **Current Location** - Shows user on map

---

### 12. Data Display Components

- **Lists** - Reusable list container
- **Cards** - For place/list items
- **Dialogs** - For editing
- **Drawers** - For mobile-friendly selection
- **Badges** - For counts, status
- **Avatars** - For user/collaborator display
- **Buttons** - Various variants (default, outline, ghost, destructive)
- **Inputs** - Text, email, date, textarea
- **Alerts** - Error/success messages
- **Loading** - Spinners, skeleton states

---

## Redesign Considerations

### Keep
- Clean, focused UX
- Map integration is core to the experience
- Visit tracking is valuable
- Collaboration is differentiating
- View transitions for polish

### Rethink
- Could use more modern navigation patterns
- Consider bottom nav for mobile
- Places could benefit from more visual richness
- Could expand analytics (popular times, etc.)
- Social features could be expanded

### Technical Observations
- Heavy use of localStorage for drafts
- Geolocation is central to UX
- Optimistic UI updates throughout
- Strong keyboard accessibility
- View transitions API used well
