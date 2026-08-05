import { db, pool } from '@hominem/db';
import { Hono } from 'hono';
import { beforeAll, describe, expect, it } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { careerRoutes } from './career';

const userId = 'a1000001-0000-4000-8000-000000000001';
const otherUserId = 'a1000001-0000-4000-8000-000000000002';
const applicationId = 'a1000002-0000-4000-8000-000000000001';

function makeUser(id: string): RpcUser {
  return {
    id,
    email: `${id}@test.dev`,
    name: 'Career Test User',
    emailVerified: true,
    image: null,
    isAdmin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createApp(asUserId: string) {
  const user = makeUser(asUserId);
  return new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use('*', async (c, next) => {
      c.set('auth', { user, userId: user.id, credential: 'session', scopes: [] });
      await next();
    })
    .route('/career', careerRoutes);
}

async function postJson(app: ReturnType<typeof createApp>, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  for (const id of [userId, otherUserId]) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [id, 'Career Test User', `${id}@test.dev`, true],
    );
  }

  await db
    .insertInto('app.careerApplications')
    .values({
      id: applicationId,
      ownerUserid: userId,
      company: 'Acme',
      title: 'Engineer',
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
});

describe('career skills routes', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const app = createApp(userId);

    const created = await postJson(app, '/career/skills/create', {
      name: 'TypeScript',
      category: 'technical',
      level: 70,
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string; name: string };
    expect(createdBody.name).toBe('TypeScript');

    const listed = await app.request('/career/skills');
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as { skills: { id: string }[] };
    expect(listedBody.skills.some((s) => s.id === createdBody.id)).toBe(true);

    const updated = await postJson(app, '/career/skills/update', {
      id: createdBody.id,
      data: { level: 90 },
    });
    expect(updated.status).toBe(200);
    const updatedBody = (await updated.json()) as { level: number };
    expect(updatedBody.level).toBe(90);

    const deleted = await postJson(app, '/career/skills/delete', { id: createdBody.id });
    expect(deleted.status).toBe(200);

    const listedAfter = await app.request('/career/skills');
    const listedAfterBody = (await listedAfter.json()) as { skills: { id: string }[] };
    expect(listedAfterBody.skills.some((s) => s.id === createdBody.id)).toBe(false);
  });

  it('rejects updating another owner skill with 404', async () => {
    const owner = createApp(userId);
    const intruder = createApp(otherUserId);

    const created = await postJson(owner, '/career/skills/create', { name: 'Rust' });
    const { id } = (await created.json()) as { id: string };

    const attempt = await postJson(intruder, '/career/skills/update', {
      id,
      data: { level: 1 },
    });
    expect(attempt.status).toBe(404);

    await postJson(owner, '/career/skills/delete', { id });
  });
});

describe('career projects, testimonials, certifications, social-links', () => {
  it('creates and lists a project', async () => {
    const app = createApp(userId);
    const created = await postJson(app, '/career/projects/create', {
      title: 'Side Project',
      technologies: ['TypeScript', 'React'],
    });
    expect(created.status).toBe(201);

    const listed = await app.request('/career/projects');
    const body = (await listed.json()) as { projects: { title: string }[] };
    expect(body.projects.some((p) => p.title === 'Side Project')).toBe(true);
  });

  it('creates and lists a testimonial', async () => {
    const app = createApp(userId);
    const created = await postJson(app, '/career/testimonials/create', {
      name: 'Jane Manager',
      content: 'Great to work with.',
    });
    expect(created.status).toBe(201);

    const listed = await app.request('/career/testimonials');
    const body = (await listed.json()) as { testimonials: { name: string }[] };
    expect(body.testimonials.some((t) => t.name === 'Jane Manager')).toBe(true);
  });

  it('creates and lists a certification', async () => {
    const app = createApp(userId);
    const created = await postJson(app, '/career/certifications/create', {
      name: 'AWS Certified',
      issuingOrganization: 'AWS',
    });
    expect(created.status).toBe(201);

    const listed = await app.request('/career/certifications');
    const body = (await listed.json()) as { certifications: { name: string }[] };
    expect(body.certifications.some((c) => c.name === 'AWS Certified')).toBe(true);
  });

  it('saves and reads social links', async () => {
    const app = createApp(userId);
    const saved = await postJson(app, '/career/social-links/save', {
      github: 'https://github.com/example',
    });
    expect(saved.status).toBe(200);

    const read = await app.request('/career/social-links');
    const body = (await read.json()) as { socialLinks: { github: string | null } | null };
    expect(body.socialLinks?.github).toBe('https://github.com/example');
  });
});

describe('career application notes and files', () => {
  it('round-trips a note on an owned application', async () => {
    const app = createApp(userId);

    const created = await postJson(app, `/career/applications/${applicationId}/notes/create`, {
      content: 'Phone screen went well.',
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const listed = await app.request(`/career/applications/${applicationId}/notes`);
    const body = (await listed.json()) as { notes: { id: string }[] };
    expect(body.notes.some((n) => n.id === id)).toBe(true);

    const deleted = await postJson(app, `/career/applications/${applicationId}/notes/delete`, {
      id,
    });
    expect(deleted.status).toBe(200);
  });

  it('rejects notes on an application owned by another user with 404', async () => {
    const intruder = createApp(otherUserId);

    const attempt = await postJson(intruder, `/career/applications/${applicationId}/notes/create`, {
      content: 'Should not be allowed.',
    });
    expect(attempt.status).toBe(404);
  });

  it('round-trips a file on an owned application', async () => {
    const app = createApp(userId);

    const created = await postJson(app, `/career/applications/${applicationId}/files/create`, {
      fileName: 'resume.pdf',
      fileUrl: 'https://storage.example.com/resume.pdf',
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const listed = await app.request(`/career/applications/${applicationId}/files`);
    const body = (await listed.json()) as { files: { id: string }[] };
    expect(body.files.some((f) => f.id === id)).toBe(true);

    const deleted = await postJson(app, `/career/applications/${applicationId}/files/delete`, {
      id,
    });
    expect(deleted.status).toBe(200);
  });
});
