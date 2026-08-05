import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  addCareerApplicationFile,
  addCareerApplicationNote,
  createCareerCertification,
  createCareerProject,
  createCareerSkill,
  createCareerTestimonial,
  getCareerApplicationDetail,
  getCareerProfile,
  getCareerSocialLinks,
  listCareerApplicationFiles,
  listCareerApplicationNotes,
  listCareerApplications,
  listCareerCertifications,
  listCareerEducation,
  listCareerPositions,
  listCareerProjects,
  listCareerSkills,
  listCareerTestimonials,
  removeCareerApplicationFile,
  removeCareerApplicationNote,
  removeCareerCertification,
  removeCareerProject,
  removeCareerSkill,
  removeCareerTestimonial,
  saveCareerSocialLinks,
  updateCareerCertification,
  updateCareerProject,
  updateCareerSkill,
  updateCareerTestimonial,
} from '../../application/career.service';
import {
  careerApplicationFileCreateSchema,
  careerApplicationFileDeleteSchema,
  careerApplicationNoteCreateSchema,
  careerApplicationNoteDeleteSchema,
  careerCertificationCreateSchema,
  careerCertificationDeleteSchema,
  careerCertificationUpdateSchema,
  careerProjectCreateSchema,
  careerProjectDeleteSchema,
  careerProjectUpdateSchema,
  careerSkillCreateSchema,
  careerSkillDeleteSchema,
  careerSkillUpdateSchema,
  careerSocialLinksSaveSchema,
  careerTestimonialCreateSchema,
  careerTestimonialDeleteSchema,
  careerTestimonialUpdateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/profile', async (c) => {
    const userId = c.get('auth')!.userId;
    const profile = await getCareerProfile(userId);
    return c.json({ profile });
  })
  .get('/positions', async (c) => {
    const userId = c.get('auth')!.userId;
    const type = c.req.query('type') as 'all' | 'employment' | 'target' | undefined;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await listCareerPositions(userId, { type, limit });
    return c.json(result);
  })
  .get('/applications', async (c) => {
    const userId = c.get('auth')!.userId;
    const status = c.req.query('status');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await listCareerApplications(userId, { status, limit });
    return c.json(result);
  })
  .get('/applications/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const id = c.req.param('id');
    const result = await getCareerApplicationDetail(userId, id);
    return c.json(result);
  })
  .get('/education', async (c) => {
    const userId = c.get('auth')!.userId;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await listCareerEducation(userId, limit);
    return c.json(result);
  })
  // -- Skills --
  .get('/skills', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerSkills(userId));
  })
  .post('/skills/create', zValidator('json', careerSkillCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerSkill(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/skills/update', zValidator('json', careerSkillUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerSkill(userId, id, data);
    if (!updated) throw new NotFoundError('Skill not found');
    return c.json(updated);
  })
  .post('/skills/delete', zValidator('json', careerSkillDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await removeCareerSkill(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Projects --
  .get('/projects', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerProjects(userId));
  })
  .post('/projects/create', zValidator('json', careerProjectCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerProject(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/projects/update', zValidator('json', careerProjectUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerProject(userId, id, data);
    if (!updated) throw new NotFoundError('Project not found');
    return c.json(updated);
  })
  .post('/projects/delete', zValidator('json', careerProjectDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await removeCareerProject(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Testimonials --
  .get('/testimonials', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerTestimonials(userId));
  })
  .post('/testimonials/create', zValidator('json', careerTestimonialCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerTestimonial(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/testimonials/update', zValidator('json', careerTestimonialUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerTestimonial(userId, id, data);
    if (!updated) throw new NotFoundError('Testimonial not found');
    return c.json(updated);
  })
  .post('/testimonials/delete', zValidator('json', careerTestimonialDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await removeCareerTestimonial(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Certifications --
  .get('/certifications', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerCertifications(userId));
  })
  .post(
    '/certifications/create',
    zValidator('json', careerCertificationCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const created = await createCareerCertification(userId, c.req.valid('json'));
      return c.json(created, 201);
    },
  )
  .post(
    '/certifications/update',
    zValidator('json', careerCertificationUpdateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id, data } = c.req.valid('json');
      const updated = await updateCareerCertification(userId, id, data);
      if (!updated) throw new NotFoundError('Certification not found');
      return c.json(updated);
    },
  )
  .post(
    '/certifications/delete',
    zValidator('json', careerCertificationDeleteSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      await removeCareerCertification(userId, c.req.valid('json').id);
      return c.json({ success: true });
    },
  )
  // -- Social links --
  .get('/social-links', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getCareerSocialLinks(userId));
  })
  .post('/social-links/save', zValidator('json', careerSocialLinksSaveSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const saved = await saveCareerSocialLinks(userId, c.req.valid('json'));
    return c.json(saved);
  })
  // -- Application notes --
  .get('/applications/:id/notes', async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplicationNotes(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post(
    '/applications/:id/notes/create',
    zValidator('json', careerApplicationNoteCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const note = await addCareerApplicationNote(
        userId,
        c.req.param('id'),
        c.req.valid('json').content,
      );
      if (!note) throw new NotFoundError('Application not found');
      return c.json(note, 201);
    },
  )
  .post(
    '/applications/:id/notes/delete',
    zValidator('json', careerApplicationNoteDeleteSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const ok = await removeCareerApplicationNote(
        userId,
        c.req.param('id'),
        c.req.valid('json').id,
      );
      if (!ok) throw new NotFoundError('Application not found');
      return c.json({ success: true });
    },
  )
  // -- Application files --
  .get('/applications/:id/files', async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplicationFiles(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post(
    '/applications/:id/files/create',
    zValidator('json', careerApplicationFileCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const file = await addCareerApplicationFile(userId, c.req.param('id'), c.req.valid('json'));
      if (!file) throw new NotFoundError('Application not found');
      return c.json(file, 201);
    },
  )
  .post(
    '/applications/:id/files/delete',
    zValidator('json', careerApplicationFileDeleteSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const ok = await removeCareerApplicationFile(
        userId,
        c.req.param('id'),
        c.req.valid('json').id,
      );
      if (!ok) throw new NotFoundError('Application not found');
      return c.json({ success: true });
    },
  );
