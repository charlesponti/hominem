import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';

import { PendingPlaceListInvites } from './pending-place-list-invites';

const placeList = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Japan Trip',
  description: null,
  visibility: 'shared' as const,
  kind: 'place_list' as const,
  itemCount: 4,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const meta = {
  title: 'Chat/Pending Place List Invites',
  component: PendingPlaceListInvites,
} satisfies Meta<typeof PendingPlaceListInvites>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/place-lists/invites', () =>
        HttpResponse.json({
          invites: [{ placeList, role: 'editor', invitedAt: placeList.createdAt }],
          count: 1,
        }),
      ),
      http.post('/api/place-lists/:id/collaborators/accept', () =>
        HttpResponse.json({ member: {} }),
      ),
    );
  },
};
