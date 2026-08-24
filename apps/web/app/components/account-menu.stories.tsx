import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';

import { AccountMenu } from './account-menu';

const meta = {
  title: 'Account/Account Menu',
  component: AccountMenu,
  parameters: { layout: 'fullscreen' },
  args: {
    user: {
      id: 'user-1',
      name: 'Charles Ponti',
      email: 'charles@example.com',
      emailVerified: true,
      image: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/collections/invites', () => HttpResponse.json({ invites: [], count: 0 })),
      http.get('/api/place-lists/invites', () => HttpResponse.json({ invites: [], count: 0 })),
    );
  },
};
