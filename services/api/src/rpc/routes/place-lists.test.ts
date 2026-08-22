import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { validationErrorMiddleware } from '../middleware/validation';

const placeLists = vi.hoisted(() => ({
  acceptCollaboratorInvite: vi.fn(),
  addPlaceToList: vi.fn(),
  createPlaceList: vi.fn(),
  inviteCollaborator: vi.fn(),
  listMyPendingInvites: vi.fn(),
  listPlaceLists: vi.fn(),
  placeListDetail: vi.fn(),
  removePlaceFromList: vi.fn(),
}));

vi.mock('../../application/place-lists.service', () => placeLists);

import { placeListsRoutes } from './place-lists';

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'places@example.com',
  name: 'Place List Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createApp(authenticated = true) {
  const app = new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use(requestIdMiddleware)
    .use(validationErrorMiddleware);

  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('auth', { user: testUser, userId: testUser.id, credential: 'session', scopes: [] });
      await next();
    });
  }

  return app.route('/api/place-lists', placeListsRoutes);
}

describe('place-lists routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(placeLists)) fn.mockReset();
  });

  it('requires authentication', async () => {
    const response = await createApp(false).request('/api/place-lists');

    expect(response.status).toBe(401);
  });

  it('lists place lists for the authenticated owner', async () => {
    placeLists.listPlaceLists.mockResolvedValue({ placeLists: [], count: 0 });

    const response = await createApp().request('/api/place-lists?limit=10');

    expect(response.status).toBe(200);
    expect(placeLists.listPlaceLists).toHaveBeenCalledWith(testUser.id, { limit: 10 });
  });

  it('creates a place list', async () => {
    const created = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Japan trip',
      description: null,
      visibility: 'private',
      kind: 'place_list',
      itemCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    placeLists.createPlaceList.mockResolvedValue({ placeList: created });

    const response = await createApp().request('/api/place-lists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Japan trip' }),
    });

    expect(response.status).toBe(201);
    expect(placeLists.createPlaceList).toHaveBeenCalledWith(testUser.id, {
      name: 'Japan trip',
      visibility: 'private',
    });
  });

  it('adds a place to a list', async () => {
    placeLists.addPlaceToList.mockResolvedValue({
      item: {
        place: { id: 'p1', name: 'Kyoto', address: null, latitude: null, longitude: null },
        note: null,
        visited: false,
        addedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const response = await createApp().request('/api/place-lists/list-1/places', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Kyoto' }),
    });

    expect(response.status).toBe(201);
    expect(placeLists.addPlaceToList).toHaveBeenCalledWith(testUser.id, {
      name: 'Kyoto',
      placeListId: 'list-1',
    });
  });

  it('invites a collaborator by email', async () => {
    placeLists.inviteCollaborator.mockResolvedValue({
      member: {
        userId: 'u2',
        invitedEmail: null,
        role: 'viewer',
        invitedAt: '2026-01-01T00:00:00.000Z',
        acceptedAt: null,
      },
    });

    const response = await createApp().request('/api/place-lists/list-1/collaborators', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'friend@example.com' }),
    });

    expect(response.status).toBe(201);
    expect(placeLists.inviteCollaborator).toHaveBeenCalledWith(testUser.id, {
      email: 'friend@example.com',
      placeListId: 'list-1',
      role: 'viewer',
    });
  });

  it('lists pending invites for the authenticated caller', async () => {
    placeLists.listMyPendingInvites.mockResolvedValue({ invites: [], count: 0 });

    const response = await createApp().request('/api/place-lists/invites?limit=10');

    expect(response.status).toBe(200);
    expect(placeLists.listMyPendingInvites).toHaveBeenCalledWith(testUser.id, { limit: 10 });
  });
});
