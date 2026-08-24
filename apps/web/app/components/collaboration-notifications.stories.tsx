import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';

import { CollaborationNotifications } from './collaboration-notifications';

const collection = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Sweety Blinders',
  description: null,
  visibility: 'shared' as const,
  kind: 'generic' as const,
  itemCount: 3,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const placeList = {
  ...collection,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Japan Trip',
  kind: 'place_list' as const,
};

const emptyCollectionInvites = http.get('/api/collections/invites', () =>
  HttpResponse.json({ invites: [], count: 0 }),
);
const emptyPlaceListInvites = http.get('/api/place-lists/invites', () =>
  HttpResponse.json({ invites: [], count: 0 }),
);
const acceptCollectionInvite = http.post('/api/collections/invites/:id/accept', () =>
  HttpResponse.json({ member: {} }),
);
const acceptPlaceListInvite = http.post('/api/place-lists/:id/collaborators/accept', () =>
  HttpResponse.json({ member: {} }),
);
const declineCollectionInvite = http.post('/api/collections/invites/:id/decline', () =>
  HttpResponse.json({ removed: true }),
);
const declinePlaceListInvite = http.post('/api/place-lists/:id/collaborators/decline', () =>
  HttpResponse.json({ removed: true }),
);

const meta = {
  title: 'Account/Collaboration Notifications',
  component: CollaborationNotifications,
} satisfies Meta<typeof CollaborationNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  beforeEach({ msw }) {
    msw.use(emptyCollectionInvites, emptyPlaceListInvites);
  },
};

export const CollectionInvite: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () =>
        HttpResponse.json({
          invites: [{ collection, role: 'editor', invitedAt: collection.createdAt }],
          count: 1,
        }),
      ),
      emptyPlaceListInvites,
      acceptCollectionInvite,
      declineCollectionInvite,
    );
  },
};

export const PlaceListInvite: Story = {
  beforeEach({ msw }) {
    msw.use(
      emptyCollectionInvites,
      http.get('/api/place-lists/invites', () =>
        HttpResponse.json({
          invites: [{ placeList, role: 'viewer', invitedAt: placeList.createdAt }],
          count: 1,
        }),
      ),
      acceptPlaceListInvite,
      declinePlaceListInvite,
    );
  },
};

export const MixedInvites: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () =>
        HttpResponse.json({
          invites: [{ collection, role: 'editor', invitedAt: collection.createdAt }],
          count: 1,
        }),
      ),
      http.get('/api/place-lists/invites', () =>
        HttpResponse.json({
          invites: [{ placeList, role: 'viewer', invitedAt: placeList.createdAt }],
          count: 1,
        }),
      ),
      acceptCollectionInvite,
      acceptPlaceListInvite,
      declineCollectionInvite,
      declinePlaceListInvite,
    );
  },
};

export const Loading: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () => new Promise(() => undefined)),
      emptyPlaceListInvites,
    );
  },
};

export const Error: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () => HttpResponse.error()),
      http.get('/api/place-lists/invites', () => HttpResponse.error()),
    );
  },
};

export const CollectionInviteWithSlowAccept: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () =>
        HttpResponse.json({
          invites: [{ collection, role: 'editor', invitedAt: collection.createdAt }],
          count: 1,
        }),
      ),
      emptyPlaceListInvites,
      http.post('/api/collections/invites/:id/accept', async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({ member: {} });
      }),
      declineCollectionInvite,
    );
  },
};
