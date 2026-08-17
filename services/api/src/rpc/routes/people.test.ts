import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { validationErrorMiddleware } from '../middleware/validation';

const people = vi.hoisted(() => ({
  createPerson: vi.fn(),
  searchPeople: vi.fn(),
}));

vi.mock('../../application/people.service', () => people);

import { peopleRoutes } from './people';

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'people@example.com',
  name: 'People Test User',
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
      c.set('auth', {
        user: testUser,
        userId: testUser.id,
        credential: 'session',
        scopes: [],
      });
      await next();
    });
  }

  return app.route('/api/people', peopleRoutes);
}

describe('people routes', () => {
  beforeEach(() => {
    people.createPerson.mockReset();
    people.searchPeople.mockReset();
  });

  it('requires authentication', async () => {
    const response = await createApp(false).request('/api/people?query=maya');

    expect(response.status).toBe(401);
  });

  it('searches people for the authenticated owner', async () => {
    people.searchPeople.mockResolvedValue({ people: [], count: 0 });

    const response = await createApp().request('/api/people?query=maya&limit=5');

    expect(response.status).toBe(200);
    expect(people.searchPeople).toHaveBeenCalledWith({
      ownerUserId: testUser.id,
      query: 'maya',
      limit: 5,
    });
  });

  it('creates a person with the authenticated owner', async () => {
    people.createPerson.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      displayName: 'Maya Chen',
      email: 'maya@example.com',
    });

    const response = await createApp().request('/api/people', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Maya Chen', email: 'maya@example.com' }),
    });

    expect(response.status).toBe(201);
    expect(people.createPerson).toHaveBeenCalledWith({
      ownerUserId: testUser.id,
      displayName: 'Maya Chen',
      email: 'maya@example.com',
    });
  });
});
