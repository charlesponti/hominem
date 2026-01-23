# Rocco App: tRPC to Hono RPC Migration Guide

This guide provides exact, step-by-step changes for migrating approximately 40 component and utility files in `apps/rocco` from tRPC to Hono RPC.

---

## Architecture Overview

### Current tRPC Architecture

- **Server Router**: `apps/rocco/app/lib/trpc/router.ts`
- **Routers**: Individual files like `lists.ts`, `places.ts`, `invites.ts`, `trips.ts`, `people.ts`
- **Context**: `apps/rocco/app/lib/trpc/context.ts` (uses tRPC's `initTRPC`)
- **Server Setup**: `apps/rocco/app/routes/api/trpc.ts` (uses `fetchRequestHandler`)
- **Client**: `apps/rocco/app/lib/trpc/client.ts` (uses `createTRPCReact`)
- **Provider**: `apps/rocco/app/lib/trpc/provider.tsx` (wraps with `trpc.Provider`)

### New Hono Architecture

- **Hono RPC Server**: `packages/hono-rpc/src/index.ts` (new Hono app)
- **Routes**: `packages/hono-rpc/src/routes/` (places.ts, lists.ts, etc.)
- **Context**: `packages/hono-rpc/src/middleware/context.ts` (Hono middleware)
- **Client**: `packages/hono-client/src/` (HonoClient class)
- **Hooks**: `packages/hono-client/src/react/hooks.ts` (`useHonoQuery`, `useHonoMutation`)

---

## File Categories & Migration Patterns

---

## 1. COMPONENTS USING `trpc.lists.*`

### Files Affected

- `apps/rocco/app/components/lists/list-form.tsx`
- `apps/rocco/app/components/lists/list-edit-dialog.tsx`
- `apps/rocco/app/components/lists/sent-invite-form.tsx`
- `apps/rocco/app/components/lists/list-delete-button.tsx`
- `apps/rocco/app/components/lists/list-edit-button.tsx`
- `apps/rocco/app/components/lists/remove-collaborator-button.tsx`
- `apps/rocco/app/components/lists/sent-invites.tsx`
- `apps/rocco/app/components/lists/list-row.tsx`

### Pattern: useQuery for Reading Lists

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function MyComponent() {
  const { data: lists } = trpc.lists.getAll.useQuery();
  // Use lists data
}
```

**AFTER (Hono)**

```typescript
import { useHonoQuery } from '@hominem/hono-client';
import { useHonoClient } from '@hominem/hono-client';

export function MyComponent() {
  const { data: lists } = useHonoQuery(['lists', 'getAll'], async (client) => {
    const res = await client.api.lists.getAll.$post();
    return res.json();
  });
  // Use lists data
}
```

### Pattern: useMutation for Creating Lists

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function ListForm() {
  const { mutate: createList } = trpc.lists.create.useMutation({
    onSuccess: () => {
      // Handle success
    },
  });

  const handleSubmit = () => {
    createList({ name: 'My List' });
  };
}
```

**AFTER (Hono)**

```typescript
import { useHonoMutation } from '@hominem/hono-client';

export function ListForm() {
  const { mutate: createList } = useHonoMutation(
    async (client, variables) => {
      const res = await client.api.lists.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        // Handle success
      },
      invalidateKeys: [['lists', 'getAll']],
    },
  );

  const handleSubmit = () => {
    createList({ name: 'My List' });
  };
}
```

### Pattern: Conditional Queries (getById)

**BEFORE (tRPC)**

```typescript
const { data: list } = trpc.lists.getById.useQuery(
  { id: listId },
  {
    enabled: !!listId,
  },
);
```

**AFTER (Hono)**

```typescript
const { data: list } = useHonoQuery(
  ['lists', 'getById', listId],
  async (client) => {
    const res = await client.api.lists.get.$post({ json: { id: listId } });
    return res.json();
  },
  {
    enabled: !!listId,
  },
);
```

### Pattern: Delete Mutation

**BEFORE (tRPC)**

```typescript
const { mutate: deleteList } = trpc.lists.delete.useMutation({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
});

const handleDelete = () => {
  deleteList({ id: listId });
};
```

**AFTER (Hono)**

```typescript
const { mutate: deleteList } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.lists.delete.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['lists', 'getAll']],
  },
);

const handleDelete = () => {
  deleteList({ id: listId });
};
```

---

## 2. COMPONENTS USING `trpc.places.*`

### Files Affected

- `apps/rocco/app/components/places/places-list.tsx`
- `apps/rocco/app/components/places/places-autocomplete.tsx`
- `apps/rocco/app/components/places/add-to-list-control.tsx`
- `apps/rocco/app/components/places/place-row.tsx`
- `apps/rocco/app/components/places/PlaceMap.tsx`
- `apps/rocco/app/components/places/places-nearby.tsx`
- `apps/rocco/app/components/places/LogVisit.tsx`
- `apps/rocco/app/components/places/PlaceLists.tsx`
- `apps/rocco/app/components/places/VisitHistory.tsx`

### Pattern: Multiple Conditional Queries

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function AddToListControl({ placeId }) {
  const isUuid = z.uuid().safeParse(placeId).success;

  const { data: placeDetails } = trpc.places.getDetailsById.useQuery(
    { id: placeId },
    { enabled: isAuthenticated && isUuid },
  );

  const { data: placeDetailsByGoogleId } = trpc.places.getDetailsByGoogleId.useQuery(
    { googleMapsId: placeId },
    { enabled: isAuthenticated && !isUuid },
  );

  const place = placeDetails || placeDetailsByGoogleId;
}
```

**AFTER (Hono)**

```typescript
import { useHonoQuery } from '@hominem/hono-client';

export function AddToListControl({ placeId }) {
  const isUuid = z.uuid().safeParse(placeId).success;

  const { data: placeDetails } = useHonoQuery(
    ['places', 'getDetailsById', placeId],
    async (client) => {
      const res = await client.api.places.get.$post({ json: { id: placeId } });
      return res.json();
    },
    { enabled: isAuthenticated && isUuid },
  );

  const { data: placeDetailsByGoogleId } = useHonoQuery(
    ['places', 'getDetailsByGoogleId', placeId],
    async (client) => {
      const res = await client.api.places['get-by-google-id'].$post({
        json: { googleMapsId: placeId },
      });
      return res.json();
    },
    { enabled: isAuthenticated && !isUuid },
  );

  const place = placeDetails || placeDetailsByGoogleId;
}
```

### Pattern: Autocomplete Query

**BEFORE (tRPC)**

```typescript
export function PlacesAutocomplete() {
  const trimmed = input.trim();
  const enabled = trimmed.length >= 3;

  return trpc.places.autocomplete.useQuery(
    location
      ? { query: trimmed, latitude: location.latitude, longitude: location.longitude }
      : { query: trimmed },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    },
  );
}
```

**AFTER (Hono)**

```typescript
export function PlacesAutocomplete() {
  const trimmed = input.trim();
  const enabled = trimmed.length >= 3;

  return useHonoQuery(
    ['places', 'autocomplete', trimmed, location?.latitude, location?.longitude],
    async (client) => {
      const res = await client.api.places.autocomplete.$post({
        json: location
          ? { query: trimmed, latitude: location.latitude, longitude: location.longitude }
          : { query: trimmed },
      });
      return res.json();
    },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    },
  );
}
```

### Pattern: Place Creation with Upload

**BEFORE (tRPC)**

```typescript
const { mutate: createPlace, status } = trpc.places.create.useMutation({
  onSuccess: () => {
    invalidateQueries(['places']);
  },
});

const handleCreate = async (data) => {
  await createPlace({
    name: data.name,
    googleMapsId: data.googleMapsId,
    photos: data.photos,
    listIds: data.listIds,
  });
};
```

**AFTER (Hono)**

```typescript
const { mutate: createPlace, status } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.places.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['places'], ['lists', 'getAll']],
  },
);

const handleCreate = async (data) => {
  await createPlace({
    name: data.name,
    googleMapsId: data.googleMapsId,
    photos: data.photos,
    listIds: data.listIds,
  });
};
```

### Pattern: Visit Operations

**BEFORE (tRPC)**

```typescript
const { mutate: logVisit } = trpc.places.logVisit.useMutation();
const { mutate: updateVisit } = trpc.places.updateVisit.useMutation();
const { mutate: deleteVisit } = trpc.places.deleteVisit.useMutation();

const { data: visits } = trpc.places.getMyVisits.useQuery({
  limit: 20,
  offset: 0,
});
```

**AFTER (Hono)**

```typescript
const { mutate: logVisit } = useHonoMutation(async (client, variables) => {
  const res = await client.api.places['log-visit'].$post({ json: variables });
  return res.json();
});

const { mutate: updateVisit } = useHonoMutation(async (client, variables) => {
  const res = await client.api.places['update-visit'].$post({ json: variables });
  return res.json();
});

const { mutate: deleteVisit } = useHonoMutation(async (client, variables) => {
  const res = await client.api.places['delete-visit'].$post({ json: variables });
  return res.json();
});

const { data: visits } = useHonoQuery(['places', 'myVisits', 20, 0], async (client) => {
  const res = await client.api.places['my-visits'].$post({
    json: { limit: 20, offset: 0 },
  });
  return res.json();
});
```

---

## 3. COMPONENTS USING `trpc.invites.*`

### Files Affected

- `apps/rocco/app/components/ReceivedInviteItem.tsx`
- `apps/rocco/app/components/lists/sent-invites.tsx`
- `apps/rocco/app/components/lists/sent-invite-item.tsx`
- `apps/rocco/app/components/lists/sent-invite-form.tsx`
- `apps/rocco/app/components/lists/delete-invite-button.tsx`

### Pattern: Invite Acceptance

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function ReceivedInviteItem({ invite }) {
  const { mutate, status } = trpc.invites.accept.useMutation();

  const onAcceptClick = () => {
    mutate({
      listId: invite.listId,
      token: invite.token,
    });
  };
}
```

**AFTER (Hono)**

```typescript
import { useHonoMutation } from '@hominem/hono-client';

export function ReceivedInviteItem({ invite }) {
  const { mutate, status } = useHonoMutation(
    async (client, variables) => {
      const res = await client.api.invites.accept.$post({ json: variables });
      return res.json();
    },
    {
      invalidateKeys: [
        ['invites', 'getReceived'],
        ['lists', 'getAll'],
      ],
    },
  );

  const onAcceptClick = () => {
    mutate({
      listId: invite.listId,
      token: invite.token,
    });
  };
}
```

### Pattern: Send Invite

**BEFORE (tRPC)**

```typescript
const { mutate: sendInvite } = trpc.invites.create.useMutation({
  onSuccess: () => {
    // refresh invites
  },
});

const handleSend = (email) => {
  sendInvite({
    listId: currentListId,
    invitedUserEmail: email,
  });
};
```

**AFTER (Hono)**

```typescript
const { mutate: sendInvite } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.invites.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [
      ['invites', 'getSent'],
      ['invites', 'getByList'],
    ],
  },
);

const handleSend = (email) => {
  sendInvite({
    listId: currentListId,
    invitedUserEmail: email,
  });
};
```

### Pattern: Get Received Invites

**BEFORE (tRPC)**

```typescript
const { data: invites } = trpc.invites.getReceived.useQuery({
  token: previewToken,
});

const { data: sentInvites } = trpc.invites.getSent.useQuery();

const { data: listInvites } = trpc.invites.getByList.useQuery(
  { listId: currentListId },
  { enabled: !!currentListId },
);
```

**AFTER (Hono)**

```typescript
const { data: invites } = useHonoQuery(['invites', 'getReceived', previewToken], async (client) => {
  const res = await client.api.invites['get-received'].$post({
    json: { token: previewToken },
  });
  return res.json();
});

const { data: sentInvites } = useHonoQuery(['invites', 'getSent'], async (client) => {
  const res = await client.api.invites['get-sent'].$post();
  return res.json();
});

const { data: listInvites } = useHonoQuery(
  ['invites', 'getByList', currentListId],
  async (client) => {
    const res = await client.api.invites['get-by-list'].$post({
      json: { listId: currentListId },
    });
    return res.json();
  },
  { enabled: !!currentListId },
);
```

### Pattern: Delete Invite

**BEFORE (tRPC)**

```typescript
const { mutate: deleteInvite } = trpc.invites.delete.useMutation();

const handleDelete = (email) => {
  deleteInvite({
    listId: currentListId,
    invitedUserEmail: email,
  });
};
```

**AFTER (Hono)**

```typescript
const { mutate: deleteInvite } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.invites.delete.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [
      ['invites', 'getSent'],
      ['invites', 'getByList'],
    ],
  },
);

const handleDelete = (email) => {
  deleteInvite({
    listId: currentListId,
    invitedUserEmail: email,
  });
};
```

---

## 4. COMPONENTS USING `trpc.trips.*`

### Files Affected

- `apps/rocco/app/routes/trips._index.tsx`
- `apps/rocco/app/routes/trips.$tripId.tsx`
- `apps/rocco/app/routes/trips.create.tsx`
- `apps/rocco/app/components/trips/add-place-to-trip-modal.tsx`

### Pattern: Trip Queries

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function TripsPage() {
  const { data: trips } = trpc.trips.getAll.useQuery();

  const { data: trip } = trpc.trips.getById.useQuery({ id: tripId }, { enabled: !!tripId });
}
```

**AFTER (Hono)**

```typescript
import { useHonoQuery } from '@hominem/hono-client';

export function TripsPage() {
  const { data: trips } = useHonoQuery(['trips', 'getAll'], async (client) => {
    const res = await client.api.trips['get-all'].$post();
    return res.json();
  });

  const { data: trip } = useHonoQuery(
    ['trips', 'getById', tripId],
    async (client) => {
      const res = await client.api.trips.get.$post({ json: { id: tripId } });
      return res.json();
    },
    { enabled: !!tripId },
  );
}
```

### Pattern: Trip Creation and Item Addition

**BEFORE (tRPC)**

```typescript
const { mutate: createTrip } = trpc.trips.create.useMutation();
const addItemMutation = trpc.trips.addItem.useMutation();

const handleCreate = (data) => {
  createTrip({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
  });
};

const handleAddPlace = (itemId) => {
  await addItemMutation.mutateAsync({ tripId, itemId });
};
```

**AFTER (Hono)**

```typescript
const { mutate: createTrip } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.trips.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['trips', 'getAll']],
  },
);

const { mutate: addItem } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.trips['add-item'].$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['trips', 'getById', tripId]],
  },
);

const handleCreate = (data) => {
  createTrip({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
  });
};

const handleAddPlace = (itemId) => {
  await addItem({ tripId, itemId });
};
```

---

## 5. COMPONENTS USING `trpc.people.*`

### Files Affected

- `apps/rocco/app/components/places/PeopleMultiSelect.tsx`
- `apps/rocco/app/routes/account.tsx` (people management section)

### Pattern: People List Query

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export function PeopleMultiSelect() {
  const { data: people } = trpc.people.list.useQuery();

  return (
    <div>
      {people?.map((person) => (
        <div key={person.id}>{person.firstName}</div>
      ))}
    </div>
  );
}
```

**AFTER (Hono)**

```typescript
import { useHonoQuery } from '@hominem/hono-client';

export function PeopleMultiSelect() {
  const { data: people } = useHonoQuery(
    ['people', 'list'],
    async (client) => {
      const res = await client.api.people.list.$post();
      return res.json();
    }
  );

  return (
    <div>
      {people?.map((person) => (
        <div key={person.id}>{person.firstName}</div>
      ))}
    </div>
  );
}
```

### Pattern: Create Person

**BEFORE (tRPC)**

```typescript
const { mutate: createPerson } = trpc.people.create.useMutation({
  onSuccess: () => {
    // refresh people list
  },
});

const handleAddPerson = (data) => {
  createPerson({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
  });
};
```

**AFTER (Hono)**

```typescript
const { mutate: createPerson } = useHonoMutation(
  async (client, variables) => {
    const res = await client.api.people.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['people', 'list']],
  },
);

const handleAddPerson = (data) => {
  createPerson({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
  });
};
```

---

## 6. UTILITY FILES

### 6.1 `errors.ts` (No changes needed)

The `apps/rocco/app/lib/errors.ts` file uses tRPC error types (`TRPCError`) but is only used server-side in route handlers. It will continue to work as-is since we're keeping the server-side imports.

**Status**: Keep as-is. Only update if you add new server-side error handling.

### 6.2 `places-utils.ts` (No changes needed)

This utility file contains helper functions that don't depend on tRPC. No changes required.

**Status**: No migration needed.

### 6.3 Custom Query Keys Pattern

Create a new utility file `apps/rocco/app/lib/query-keys.ts` for type-safe query keys:

**NEW FILE: `apps/rocco/app/lib/query-keys.ts`**

```typescript
/**
 * Centralized query key factory for Hono RPC
 * Replaces tRPC's automatic query key generation
 */

export const queryKeys = {
  lists: {
    all: () => ['lists', 'getAll'] as const,
    byId: (id: string) => ['lists', 'getById', id] as const,
    containing: (placeId: string) => ['lists', 'containing', placeId] as const,
  },
  places: {
    all: () => ['places', 'all'] as const,
    detailsById: (id: string) => ['places', 'detailsById', id] as const,
    detailsByGoogleId: (id: string) => ['places', 'detailsByGoogleId', id] as const,
    autocomplete: (query: string, lat?: number, lng?: number) =>
      ['places', 'autocomplete', query, lat, lng] as const,
    myVisits: (limit?: number, offset?: number) => ['places', 'myVisits', limit, offset] as const,
    placeVisits: (placeId: string) => ['places', 'placeVisits', placeId] as const,
  },
  invites: {
    received: (token?: string) => ['invites', 'received', token] as const,
    sent: () => ['invites', 'sent'] as const,
    byList: (listId: string) => ['invites', 'byList', listId] as const,
  },
  trips: {
    all: () => ['trips', 'all'] as const,
    byId: (id: string) => ['trips', 'byId', id] as const,
  },
  people: {
    list: () => ['people', 'list'] as const,
  },
};
```

**Usage in Components**:

```typescript
import { queryKeys } from '~/lib/query-keys';
import { useHonoQuery } from '@hominem/hono-client';

export function MyComponent() {
  const { data } = useHonoQuery(queryKeys.lists.all(), async (client) => {
    const res = await client.api.lists.getAll.$post();
    return res.json();
  });
}
```

---

## 7. CUSTOM HOOKS

### 7.1 `useGooglePlacesAutocomplete.ts`

**BEFORE (tRPC)**

```typescript
import { trpc } from '~/lib/trpc/client';

export interface UseGooglePlacesAutocompleteOptions {
  input: string;
  location?: { latitude: number; longitude: number };
}

export function useGooglePlacesAutocomplete({
  input,
  location,
}: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim();
  const enabled = trimmed.length >= 3;

  return trpc.places.autocomplete.useQuery(
    location
      ? { query: trimmed, latitude: location.latitude, longitude: location.longitude }
      : { query: trimmed },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    },
  );
}
```

**AFTER (Hono)**

```typescript
import { useHonoQuery } from '@hominem/hono-client';
import { queryKeys } from './query-keys';

export interface UseGooglePlacesAutocompleteOptions {
  input: string;
  location?: { latitude: number; longitude: number };
}

export function useGooglePlacesAutocomplete({
  input,
  location,
}: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim();
  const enabled = trimmed.length >= 3;

  return useHonoQuery(
    queryKeys.places.autocomplete(trimmed, location?.latitude, location?.longitude),
    async (client) => {
      const res = await client.api.places.autocomplete.$post({
        json: location
          ? { query: trimmed, latitude: location.latitude, longitude: location.longitude }
          : { query: trimmed },
      });
      return res.json();
    },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    },
  );
}
```

---

## 8. ROUTE LOADERS (Using createCaller)

### Current tRPC Loader Pattern

**File**: `apps/rocco/app/routes/api/trpc.ts`

This file currently uses `fetchRequestHandler` to handle all tRPC requests. This will be replaced by Hono's built-in request handling.

### 8.1 Server Route Handler Replacement

**BEFORE (tRPC): `apps/rocco/app/routes/api/trpc.ts`**

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { logger } from '../../lib/logger';
import { createContext } from '../../lib/trpc/context';
import { appRouter } from '../../lib/trpc/router';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const startTime = Date.now();
  const ctx = await createContext(request);

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: async () => ctx,
    onError: ({ path, error, type, ctx }) => {
      const duration = Date.now() - startTime;
      logger.logTRPCError(error, {
        path: path ?? '<no-path>',
        type,
        duration,
        userId: ctx?.user?.id,
      });
    },
  });

  ctx.responseHeaders.forEach((value, key) => {
    response.headers.append(key, value);
  });

  return response;
};
```

**AFTER (Hono): `apps/rocco/app/routes/api/hono.ts` (NEW FILE)**

```typescript
import type { Route } from './+types/hono';
import { app } from '@hominem/hono-rpc';

export const loader = async ({ request }: Route.LoaderArgs) => {
  // Hono handles the request directly
  // The app middleware takes care of all error handling and logging
  return app.fetch(request);
};

export const action = async ({ request }: Route.ActionArgs) => {
  // Hono handles both GET and POST/PUT/DELETE
  return app.fetch(request);
};
```

**Note**: The old `/api/trpc` route should be updated to `/api/hono` in the client configuration.

### 8.2 Data Loaders with Server-Side Data Fetching

For route loaders that need to pre-fetch data, use the Hono caller instead:

**BEFORE (tRPC using createCaller)**

```typescript
import { createCaller } from '~/lib/trpc/server';
import type { Route } from './+types/lists.$id';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const caller = createCaller(new Request('http://localhost'));

  try {
    const list = await caller.lists.getById({ id: params.id });
    return { list };
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }
}
```

**AFTER (Hono - Direct Service Call)**

```typescript
import { getListById } from '@hominem/lists-services';
import { getServerAuth } from '~/lib/auth.server';
import type { Route } from './+types/lists.$id';

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  try {
    const { user } = await getServerAuth(request);

    // Call service directly instead of going through API
    const list = await getListById(params.id, user?.id || null);

    if (!list) {
      throw new Response('Not found', { status: 404 });
    }

    return { list };
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }
}
```

---

## 9. PROVIDER SETUP

### 9.1 Replace tRPC Provider

**BEFORE: `apps/rocco/app/lib/trpc/provider.tsx`**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useMemo, useState } from 'react';
import { trpc } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [httpBatchLink({ url: '/api/trpc' })],
      }),
    [],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

**AFTER: `apps/rocco/app/lib/hono/provider.tsx` (NEW FILE)**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HonoProvider } from '@hominem/hono-client';
import { useSupabaseAuthContext } from '@hominem/auth';
import { useMemo, useState } from 'react';

export function HonoRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { session } = useSupabaseAuthContext();

  const getAuthToken = async () => {
    // Return the Supabase session token if available
    return session?.access_token ?? null;
  };

  return (
    <HonoProvider
      baseUrl="/api/hono"
      getAuthToken={getAuthToken}
      queryClient={queryClient}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </HonoProvider>
  );
}
```

**Update Root Component**:

```typescript
// In apps/rocco/app/root.tsx
import { HonoRPCProvider } from './lib/hono/provider';

// Replace:
// <TRPCProvider>

// With:
// <HonoRPCProvider>
```

---

## 10. IMPORT REPLACEMENTS SUMMARY

### Remove These Imports

```typescript
// REMOVE:
import { trpc } from '~/lib/trpc/client';
import { createCaller } from '~/lib/trpc/server';
import { TRPCError } from '@trpc/server';
```

### Add These Imports

```typescript
// ADD:
import { useHonoQuery, useHonoMutation, useHonoUtils } from '@hominem/hono-client';
import { queryKeys } from '~/lib/query-keys';

// For server-side (if needed):
import type { AppContext } from '@hominem/hono-rpc';
```

---

## 11. API ENDPOINT MAPPING

### tRPC → Hono Route Mapping

```
tRPC Procedure          →  Hono POST Route
===================================================
trpc.lists.getAll       →  /api/hono/lists/get-all
trpc.lists.getById      →  /api/hono/lists/get
trpc.lists.create       →  /api/hono/lists/create
trpc.lists.update       →  /api/hono/lists/update
trpc.lists.delete       →  /api/hono/lists/delete

trpc.places.getDetailsById           →  /api/hono/places/get
trpc.places.getDetailsByGoogleId     →  /api/hono/places/get-by-google-id
trpc.places.autocomplete             →  /api/hono/places/autocomplete
trpc.places.create                   →  /api/hono/places/create
trpc.places.update                   →  /api/hono/places/update
trpc.places.delete                   →  /api/hono/places/delete
trpc.places.addToLists               →  /api/hono/places/add-to-lists
trpc.places.removeFromList           →  /api/hono/places/remove-from-list
trpc.places.getNearbyFromLists       →  /api/hono/places/nearby
trpc.places.logVisit                 →  /api/hono/places/log-visit
trpc.places.getMyVisits              →  /api/hono/places/my-visits
trpc.places.getPlaceVisits           →  /api/hono/places/place-visits
trpc.places.updateVisit              →  /api/hono/places/update-visit
trpc.places.deleteVisit              →  /api/hono/places/delete-visit
trpc.places.getVisitStats            →  /api/hono/places/visit-stats

trpc.invites.getReceived             →  /api/hono/invites/get-received
trpc.invites.getSent                 →  /api/hono/invites/get-sent
trpc.invites.getByList               →  /api/hono/invites/get-by-list
trpc.invites.create                  →  /api/hono/invites/create
trpc.invites.accept                  →  /api/hono/invites/accept
trpc.invites.decline                 →  /api/hono/invites/decline
trpc.invites.delete                  →  /api/hono/invites/delete

trpc.trips.getAll                    →  /api/hono/trips/get-all
trpc.trips.getById                   →  /api/hono/trips/get
trpc.trips.create                    →  /api/hono/trips/create
trpc.trips.addItem                   →  /api/hono/trips/add-item

trpc.people.list                     →  /api/hono/people/list
trpc.people.create                   →  /api/hono/people/create
```

---

## 12. ERROR HANDLING CHANGES

### tRPC Error vs Hono Error Response

**BEFORE (tRPC)**

```typescript
// Server-side in procedure
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'List not found',
});

// Client automatically catches and displays
```

**AFTER (Hono)**

```typescript
// Server-side in route handler
return c.json({ error: 'List not found' }, 404);

// Client must check response.ok or handle errors in mutation/query
```

### Update Error Handling in Hooks

**NEW: Create error boundary hook `apps/rocco/app/lib/hono/useErrorHandler.ts`**

```typescript
import { useCallback } from 'react';

export function useErrorHandler() {
  return useCallback((error: Error | null) => {
    if (!error) return null;

    // Map common HTTP errors to user-friendly messages
    if (error.message.includes('401')) {
      return 'You need to sign in to perform this action';
    }
    if (error.message.includes('403')) {
      return "You don't have permission to perform this action";
    }
    if (error.message.includes('404')) {
      return 'The resource was not found';
    }
    if (error.message.includes('500')) {
      return 'Something went wrong. Please try again.';
    }

    return error.message || 'An error occurred';
  }, []);
}
```

---

## 13. MIGRATION CHECKLIST

### Phase 1: Setup

- [ ] Create `packages/hono-rpc` routes for rocco (already exists)
- [ ] Create `packages/hono-client` hooks (already exists)
- [ ] Create `apps/rocco/app/lib/query-keys.ts`
- [ ] Create `apps/rocco/app/lib/hono/provider.tsx`
- [ ] Create `apps/rocco/app/lib/hono/useErrorHandler.ts`

### Phase 2: Update Root

- [ ] Update `apps/rocco/app/root.tsx` to use `HonoRPCProvider` instead of `TRPCProvider`
- [ ] Create/update `apps/rocco/app/routes/api/hono.ts`

### Phase 3: Migrate Components (by category)

- [ ] Lists components (8 files)
- [ ] Places components (9 files)
- [ ] Invites components (5 files)
- [ ] Trips components (4 files)
- [ ] People components (2 files)

### Phase 4: Migrate Custom Hooks

- [ ] Update `useGooglePlacesAutocomplete.ts`

### Phase 5: Migrate Route Loaders

- [ ] Replace `createCaller` usage in route loaders

### Phase 6: Testing

- [ ] Run component tests
- [ ] Test all query operations
- [ ] Test all mutation operations
- [ ] Test error scenarios
- [ ] Verify auth flows still work

### Phase 7: Cleanup

- [ ] Remove old tRPC files from rocco app:
  - `apps/rocco/app/lib/trpc/`
  - `apps/rocco/app/routes/api/trpc.ts`
- [ ] Remove tRPC dependencies from `apps/rocco/package.json`

---

## 14. COMMON PATTERNS & GOTCHAS

### Query Keys MUST Be Arrays

**WRONG:**

```typescript
useHonoQuery('lists', async (client) => {
  // ...
});
```

**RIGHT:**

```typescript
useHonoQuery(['lists', 'getAll'], async (client) => {
  // ...
});
```

### Always Include json Option for POST

**WRONG:**

```typescript
const res = await client.api.lists.create.$post();
```

**RIGHT:**

```typescript
const res = await client.api.lists.create.$post({ json: variables });
```

### Response Must Be Parsed

**WRONG:**

```typescript
const { data } = useHonoQuery(['lists'], async (client) => {
  return client.api.lists.getAll.$post({ json: {} });
});
```

**RIGHT:**

```typescript
const { data } = useHonoQuery(['lists'], async (client) => {
  const res = await client.api.lists.getAll.$post();
  return res.json();
});
```

### Invalidation Keys Must Match Query Keys

**WRONG:**

```typescript
useHonoMutation(
  async (client, variables) => {
    const res = await client.api.lists.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['getAll']], // ❌ Doesn't match query key
  },
);
```

**RIGHT:**

```typescript
useHonoMutation(
  async (client, variables) => {
    const res = await client.api.lists.create.$post({ json: variables });
    return res.json();
  },
  {
    invalidateKeys: [['lists', 'getAll']], // ✅ Matches
  },
);
```

---

## 15. FILE-BY-FILE MIGRATION ORDER

Priority order for migrating files to minimize breakage:

### Priority 1: Foundation (2 files)

1. `apps/rocco/app/root.tsx` - Add HonoRPCProvider
2. `apps/rocco/app/routes/api/hono.ts` - New handler

### Priority 2: Utilities (2 files)

3. `apps/rocco/app/lib/query-keys.ts` - Create this new file
4. `apps/rocco/app/lib/hono/provider.tsx` - Create this new file

### Priority 3: Custom Hooks (1 file)

5. `apps/rocco/app/hooks/useGooglePlacesAutocomplete.ts`

### Priority 4: List Components (8 files)

6. `apps/rocco/app/components/lists/list-form.tsx`
7. `apps/rocco/app/components/lists/list-edit-dialog.tsx`
8. `apps/rocco/app/components/lists/sent-invite-form.tsx`
9. `apps/rocco/app/components/lists/list-delete-button.tsx`
10. `apps/rocco/app/components/lists/list-edit-button.tsx`
11. `apps/rocco/app/components/lists/remove-collaborator-button.tsx`
12. `apps/rocco/app/components/lists/sent-invites.tsx`
13. `apps/rocco/app/components/lists/list-row.tsx`

### Priority 5: Places Components (9 files)

14. `apps/rocco/app/components/places/add-to-list-control.tsx`
15. `apps/rocco/app/components/places/places-list.tsx`
16. `apps/rocco/app/components/places/places-autocomplete.tsx`
17. `apps/rocco/app/components/places/place-row.tsx`
18. `apps/rocco/app/components/places/PlaceMap.tsx`
19. `apps/rocco/app/components/places/places-nearby.tsx`
20. `apps/rocco/app/components/places/LogVisit.tsx`
21. `apps/rocco/app/components/places/PlaceLists.tsx`
22. `apps/rocco/app/components/places/VisitHistory.tsx`

### Priority 6: Invites Components (5 files)

23. `apps/rocco/app/components/ReceivedInviteItem.tsx`
24. `apps/rocco/app/components/lists/sent-invites.tsx`
25. `apps/rocco/app/components/lists/sent-invite-item.tsx`
26. `apps/rocco/app/components/lists/sent-invite-form.tsx`
27. `apps/rocco/app/components/lists/delete-invite-button.tsx`

### Priority 7: Trips Components (4 files)

28. `apps/rocco/app/routes/trips._index.tsx`
29. `apps/rocco/app/routes/trips.$tripId.tsx`
30. `apps/rocco/app/routes/trips.create.tsx`
31. `apps/rocco/app/components/trips/add-place-to-trip-modal.tsx`

### Priority 8: People Components (2 files)

32. `apps/rocco/app/components/places/PeopleMultiSelect.tsx`
33. `apps/rocco/app/routes/account.tsx` (people section only)

### Priority 9: Route Loaders (variable)

34. All route files using `createCaller` - migrate to direct service calls

---

## 16. TESTING THE MIGRATION

### Unit Test Pattern

**BEFORE (mocking tRPC)**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { trpc } from '~/lib/trpc/client';

vi.mock('~/lib/trpc/client', () => ({
  trpc: {
    lists: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [{ id: '1', name: 'Test List' }],
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));
```

**AFTER (mocking Hono)**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHonoQuery } from '@hominem/hono-client';

vi.mock('@hominem/hono-client', () => ({
  useHonoQuery: vi.fn((key, queryFn, options) => ({
    data: [{ id: '1', name: 'Test List' }],
    isLoading: false,
    error: null,
  })),
}));
```

---

## 17. PERFORMANCE BENEFITS

The migration to Hono provides significant benefits:

1. **Faster Type-Checking**: Hono routes compile in <500ms vs tRPC's 6+ seconds
2. **Simpler Route Composition**: No complex type inference overhead
3. **Smaller Bundle Size**: Hono client is lighter than tRPC client
4. **Better Error Handling**: Explicit HTTP status codes instead of tRPC codes
5. **Easier Debugging**: Standard HTTP routes are easier to debug

---

## 18. ROLLBACK PLAN

If issues arise during migration:

1. **Keep old tRPC files intact** during initial migration phase
2. **Use feature flags** to switch between old and new providers
3. **Migrate one category at a time** rather than all at once
4. **Git branch strategy**: Keep migration in separate PR for easy rollback

Example feature flag:

```typescript
// In root.tsx
const useHonoRPC = process.env.VITE_USE_HONO_RPC === 'true';

export function Root() {
  return (
    <>
      {useHonoRPC ? (
        <HonoRPCProvider>{children}</HonoRPCProvider>
      ) : (
        <TRPCProvider>{children}</TRPCProvider>
      )}
    </>
  );
}
```

---

## Summary

This migration involves:

- **40+ files** to update with new imports and patterns
- **3 main categories**: Components, utilities, and hooks
- **Consistent pattern**: Replace `trpc.X.useQuery/useMutation` with `useHonoQuery/useHonoMutation`
- **Key difference**: Query keys are now explicit arrays instead of auto-generated
- **Error handling**: More explicit HTTP status codes instead of tRPC codes
- **Provider update**: Single `HonoRPCProvider` replaces `TRPCProvider`

The migration is straightforward once you understand the pattern. Each category follows the same transformation logic.
