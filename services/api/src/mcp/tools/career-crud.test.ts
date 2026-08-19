import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'a3000001-0000-4000-8000-000000000001';
const otherUserId = 'a3000001-0000-4000-8000-000000000002';

function resultContent(result: McpToolResult) {
  return result.structuredContent as Record<string, unknown>;
}

beforeAll(async () => {
  for (const id of [userId, otherUserId]) {
    await pool.query(
      'INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, `Career CRUD Test User ${id}`, `${id}@test.hominem.dev`, true],
    );
  }
  await import('./career');
});

describe('career_engagement_create', () => {
  it('creates an engagement visible in career_engagements', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_engagement_create', {
        company: 'Create Co',
        title: 'Founding Engineer',
      }),
    ) as { engagement: { id: string; company: string; title: string } };
    expect(created.engagement).toMatchObject({ company: 'Create Co', title: 'Founding Engineer' });

    const listed = resultContent(await callTool(userId, 'career_engagements', {})) as {
      engagements: Array<{ id: string }>;
    };
    expect(listed.engagements.some((e) => e.id === created.engagement.id)).toBe(true);

    await db.deleteFrom('app.careerEngagements').where('id', '=', created.engagement.id).execute();
  });
});

describe('career application MCP tools', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_application_create', {
        company: 'App Co',
        title: 'Platform Engineer',
      }),
    ) as { application: { id: string; company: string; title: string } };
    expect(created.application).toMatchObject({ company: 'App Co', title: 'Platform Engineer' });

    const listed = resultContent(await callTool(userId, 'career_applications', {})) as {
      applications: Array<{ id: string }>;
    };
    expect(listed.applications.some((a) => a.id === created.application.id)).toBe(true);

    const updated = resultContent(
      await callTool(userId, 'career_application_update', {
        id: created.application.id,
        data: { status: 'REJECTED' },
      }),
    ) as { application: { status: string } | null };
    expect(updated.application?.status).toBe('REJECTED');

    const removed = resultContent(
      await callTool(userId, 'career_application_delete', { id: created.application.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    const gone = await db
      .selectFrom('app.careerApplications')
      .select('id')
      .where('id', '=', created.application.id)
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });

  it('does not update or delete another user’s application', async () => {
    const { callTool } = await import('../tools');
    const application = await db
      .insertInto('app.careerApplications')
      .values({
        ownerUserid: userId,
        company: 'Secret App Co',
        title: 'Secret role',
        status: 'WISHLIST',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const updated = resultContent(
      await callTool(otherUserId, 'career_application_update', {
        id: application.id,
        data: { status: 'SCREENING' },
      }),
    ) as { application: unknown };
    expect(updated.application).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_application_delete', { id: application.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerApplications').where('id', '=', application.id).execute();
  });

  it('adds and removes an application note', async () => {
    const { callTool } = await import('../tools');
    const application = await db
      .insertInto('app.careerApplications')
      .values({ ownerUserid: userId, company: 'Note Co', title: 'Note role', status: 'WISHLIST' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const added = resultContent(
      await callTool(userId, 'career_application_note_add', {
        applicationId: application.id,
        content: 'Phone screen scheduled.',
      }),
    ) as { note: { id: string; content: string } | null };
    expect(added.note?.content).toBe('Phone screen scheduled.');

    const removed = resultContent(
      await callTool(userId, 'career_application_note_remove', {
        applicationId: application.id,
        id: (added.note as { id: string }).id,
      }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    await db.deleteFrom('app.careerApplications').where('id', '=', application.id).execute();
  });

  it('rejects note operations on another user’s application', async () => {
    const { callTool } = await import('../tools');
    const application = await db
      .insertInto('app.careerApplications')
      .values({
        ownerUserid: userId,
        company: 'Guarded Co',
        title: 'Guarded role',
        status: 'WISHLIST',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const added = resultContent(
      await callTool(otherUserId, 'career_application_note_add', {
        applicationId: application.id,
        content: 'Should not be allowed.',
      }),
    ) as { note: unknown };
    expect(added.note).toBeNull();

    await db.deleteFrom('app.careerApplications').where('id', '=', application.id).execute();
  });

  it('adds and removes an application file', async () => {
    const { callTool } = await import('../tools');
    const application = await db
      .insertInto('app.careerApplications')
      .values({ ownerUserid: userId, company: 'File Co', title: 'File role', status: 'WISHLIST' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const added = resultContent(
      await callTool(userId, 'career_application_file_add', {
        applicationId: application.id,
        fileName: 'resume.pdf',
        fileUrl: 'https://storage.example.com/resume.pdf',
      }),
    ) as { file: { id: string; fileName: string } | null };
    expect(added.file?.fileName).toBe('resume.pdf');

    const removed = resultContent(
      await callTool(userId, 'career_application_file_remove', {
        applicationId: application.id,
        id: (added.file as { id: string }).id,
      }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    await db.deleteFrom('app.careerApplications').where('id', '=', application.id).execute();
  });
});

describe('career education MCP tools', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_education_create', {
        school: 'MCP University',
        degree: 'B.S. Software Engineering',
      }),
    ) as { education: { id: string; school: string } };
    expect(created.education.school).toBe('MCP University');

    const listed = resultContent(await callTool(userId, 'career_education', {})) as {
      education: Array<{ id: string }>;
    };
    expect(listed.education.some((e) => e.id === created.education.id)).toBe(true);

    const updated = resultContent(
      await callTool(userId, 'career_education_update', {
        id: created.education.id,
        data: { degree: 'M.S. Software Engineering' },
      }),
    ) as { education: { degree: string } | null };
    expect(updated.education?.degree).toBe('M.S. Software Engineering');

    const removed = resultContent(
      await callTool(userId, 'career_education_delete', { id: created.education.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    const gone = await db
      .selectFrom('app.careerEducation')
      .select('id')
      .where('id', '=', created.education.id)
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });

  it('does not update or delete another user’s education entry', async () => {
    const { callTool } = await import('../tools');
    const education = await db
      .insertInto('app.careerEducation')
      .values({ ownerUserid: userId, school: 'Private University' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const updated = resultContent(
      await callTool(otherUserId, 'career_education_update', {
        id: education.id,
        data: { degree: 'Leaked degree' },
      }),
    ) as { education: unknown };
    expect(updated.education).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_education_delete', { id: education.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerEducation').where('id', '=', education.id).execute();
  });
});

describe('career skill MCP tools', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_skill_create', { name: 'Rust', category: 'technical' }),
    ) as { skill: { id: string; name: string } };
    expect(created.skill.name).toBe('Rust');

    const listed = resultContent(await callTool(userId, 'career_skills', {})) as {
      skills: Array<{ id: string }>;
    };
    expect(listed.skills.some((s) => s.id === created.skill.id)).toBe(true);

    const updated = resultContent(
      await callTool(userId, 'career_skill_update', {
        id: created.skill.id,
        data: { level: 80 },
      }),
    ) as { skill: { level: number } | null };
    expect(updated.skill?.level).toBe(80);

    const removed = resultContent(
      await callTool(userId, 'career_skill_delete', { id: created.skill.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);
  });

  it('does not update or delete another user’s skill', async () => {
    const { callTool } = await import('../tools');
    const skill = await db
      .insertInto('app.careerSkills')
      .values({ ownerUserid: userId, name: 'Private Skill' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const updated = resultContent(
      await callTool(otherUserId, 'career_skill_update', {
        id: skill.id,
        data: { level: 1 },
      }),
    ) as { skill: unknown };
    expect(updated.skill).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_skill_delete', { id: skill.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerSkills').where('id', '=', skill.id).execute();
  });
});

describe('career_project_create', () => {
  it('creates a project visible in career_projects', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_project_create', { title: 'MCP Test Project' }),
    ) as { project: { id: string; title: string } };
    expect(created.project.title).toBe('MCP Test Project');

    const listed = resultContent(await callTool(userId, 'career_projects', {})) as {
      projects: Array<{ id: string }>;
    };
    expect(listed.projects.some((p) => p.id === created.project.id)).toBe(true);

    await db.deleteFrom('app.careerProjects').where('id', '=', created.project.id).execute();
  });
});

describe('career testimonial MCP tools', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_testimonial_create', {
        name: 'Jane Manager',
        content: 'Great to work with.',
      }),
    ) as { testimonial: { id: string; name: string } };
    expect(created.testimonial.name).toBe('Jane Manager');

    const listed = resultContent(await callTool(userId, 'career_testimonials', {})) as {
      testimonials: Array<{ id: string }>;
    };
    expect(listed.testimonials.some((t) => t.id === created.testimonial.id)).toBe(true);

    const updated = resultContent(
      await callTool(userId, 'career_testimonial_update', {
        id: created.testimonial.id,
        data: { content: 'Updated praise.' },
      }),
    ) as { testimonial: { content: string } | null };
    expect(updated.testimonial?.content).toBe('Updated praise.');

    const removed = resultContent(
      await callTool(userId, 'career_testimonial_delete', { id: created.testimonial.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);
  });

  it('does not update or delete another user’s testimonial', async () => {
    const { callTool } = await import('../tools');
    const testimonial = await db
      .insertInto('app.careerTestimonials')
      .values({ ownerUserid: userId, name: 'Private Person', content: 'Private content' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const updated = resultContent(
      await callTool(otherUserId, 'career_testimonial_update', {
        id: testimonial.id,
        data: { content: 'Leaked' },
      }),
    ) as { testimonial: unknown };
    expect(updated.testimonial).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_testimonial_delete', { id: testimonial.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerTestimonials').where('id', '=', testimonial.id).execute();
  });
});

describe('career certification MCP tools', () => {
  it('round-trips create -> list -> update -> delete', async () => {
    const { callTool } = await import('../tools');

    const created = resultContent(
      await callTool(userId, 'career_certification_create', {
        name: 'AWS Certified',
        issuingOrganization: 'AWS',
      }),
    ) as { certification: { id: string; name: string } };
    expect(created.certification.name).toBe('AWS Certified');

    const listed = resultContent(await callTool(userId, 'career_certifications', {})) as {
      certifications: Array<{ id: string }>;
    };
    expect(listed.certifications.some((c) => c.id === created.certification.id)).toBe(true);

    const updated = resultContent(
      await callTool(userId, 'career_certification_update', {
        id: created.certification.id,
        data: { status: 'ACTIVE' },
      }),
    ) as { certification: { status: string | null } | null };
    expect(updated.certification?.status).toBe('ACTIVE');

    const removed = resultContent(
      await callTool(userId, 'career_certification_delete', { id: created.certification.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);
  });

  it('does not update or delete another user’s certification', async () => {
    const { callTool } = await import('../tools');
    const certification = await db
      .insertInto('app.careerCertifications')
      .values({ ownerUserid: userId, name: 'Private Cert', issuingOrganization: 'Private Org' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const updated = resultContent(
      await callTool(otherUserId, 'career_certification_update', {
        id: certification.id,
        data: { name: 'Leaked' },
      }),
    ) as { certification: unknown };
    expect(updated.certification).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_certification_delete', { id: certification.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerCertifications').where('id', '=', certification.id).execute();
  });
});

describe('career_social_links_save', () => {
  it('saves and reads back social links', async () => {
    const { callTool } = await import('../tools');

    const saved = resultContent(
      await callTool(userId, 'career_social_links_save', {
        github: 'https://github.com/mcp-test',
      }),
    ) as { socialLinks: { github: string | null } };
    expect(saved.socialLinks.github).toBe('https://github.com/mcp-test');

    const read = resultContent(await callTool(userId, 'career_social_links', {})) as {
      socialLinks: { github: string | null } | null;
    };
    expect(read.socialLinks?.github).toBe('https://github.com/mcp-test');
  });
});
