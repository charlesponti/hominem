import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';

import { CollaborationNotifications } from './collaboration-notifications';

const collection = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Sweety Blinders',
  description: null,
  visibility: 'shared' as const,
  itemCount: 3,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const emptyCollectionInvites = http.get('/api/collections/invites', () =>
  HttpResponse.json({ invites: [], count: 0 }),
);
const acceptCollectionInvite = http.post('/api/collections/invites/:id/accept', () =>
  HttpResponse.json({ member: {} }),
);
const declineCollectionInvite = http.post('/api/collections/invites/:id/decline', () =>
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
    msw.use(emptyCollectionInvites);
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
      acceptCollectionInvite,
      declineCollectionInvite,
    );
  },
};

export const Loading: Story = {
  beforeEach({ msw }) {
    msw.use(http.get('/api/collections/invites', () => new Promise(() => undefined)));
  },
};

export const Error: Story = {
  beforeEach({ msw }) {
    msw.use(http.get('/api/collections/invites', () => HttpResponse.error()));
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
      http.post('/api/collections/invites/:id/accept', async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({ member: {} });
      }),
      declineCollectionInvite,
    );
  },
};
