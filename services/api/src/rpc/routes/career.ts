import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { CareerService } from '../../application/career.service';
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

const careerService = new CareerService();

export const careerRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/profile', async (c) => {
    const userId = c.get('auth')!.userId;
    const profile = await careerService.getProfile(userId);
    return c.json({ profile });
  })
  .get('/positions', async (c) => {
    const userId = c.get('auth')!.userId;
    const type = c.req.query('type') as 'all' | 'employment' | 'target' | undefined;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await careerService.listPositions(userId, { type, limit });
    return c.json(result);
  })
  .get('/applications', async (c) => {
    const userId = c.get('auth')!.userId;
    const status = c.req.query('status');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await careerService.listApplications(userId, { status, limit });
    return c.json(result);
  })
  .get('/applications/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const id = c.req.param('id');
    const result = await careerService.getApplicationDetail(userId, id);
    return c.json(result);
  })
  .get('/education', async (c) => {
    const userId = c.get('auth')!.userId;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await careerService.listEducation(userId, limit);
    return c.json(result);
  })
  // -- Skills --
  .get('/skills', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await careerService.listSkills(userId));
  })
  .post('/skills/create', zValidator('json', careerSkillCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await careerService.createSkill(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/skills/update', zValidator('json', careerSkillUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await careerService.updateSkill(userId, id, data);
    if (!updated) throw new NotFoundError('Skill not found');
    return c.json(updated);
  })
  .post('/skills/delete', zValidator('json', careerSkillDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await careerService.removeSkill(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Projects --
  .get('/projects', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await careerService.listProjects(userId));
  })
  .post('/projects/create', zValidator('json', careerProjectCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await careerService.createProject(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/projects/update', zValidator('json', careerProjectUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await careerService.updateProject(userId, id, data);
    if (!updated) throw new NotFoundError('Project not found');
    return c.json(updated);
  })
  .post('/projects/delete', zValidator('json', careerProjectDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await careerService.removeProject(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Testimonials --
  .get('/testimonials', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await careerService.listTestimonials(userId));
  })
  .post('/testimonials/create', zValidator('json', careerTestimonialCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await careerService.createTestimonial(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/testimonials/update', zValidator('json', careerTestimonialUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await careerService.updateTestimonial(userId, id, data);
    if (!updated) throw new NotFoundError('Testimonial not found');
    return c.json(updated);
  })
  .post('/testimonials/delete', zValidator('json', careerTestimonialDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await careerService.removeTestimonial(userId, c.req.valid('json').id);
    return c.json({ success: true });
  })
  // -- Certifications --
  .get('/certifications', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await careerService.listCertifications(userId));
  })
  .post(
    '/certifications/create',
    zValidator('json', careerCertificationCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const created = await careerService.createCertification(userId, c.req.valid('json'));
      return c.json(created, 201);
    },
  )
  .post(
    '/certifications/update',
    zValidator('json', careerCertificationUpdateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id, data } = c.req.valid('json');
      const updated = await careerService.updateCertification(userId, id, data);
      if (!updated) throw new NotFoundError('Certification not found');
      return c.json(updated);
    },
  )
  .post(
    '/certifications/delete',
    zValidator('json', careerCertificationDeleteSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      await careerService.removeCertification(userId, c.req.valid('json').id);
      return c.json({ success: true });
    },
  )
  // -- Social links --
  .get('/social-links', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await careerService.getSocialLinks(userId));
  })
  .post('/social-links/save', zValidator('json', careerSocialLinksSaveSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const saved = await careerService.saveSocialLinks(userId, c.req.valid('json'));
    return c.json(saved);
  })
  // -- Application notes --
  .get('/applications/:id/notes', async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await careerService.listApplicationNotes(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post(
    '/applications/:id/notes/create',
    zValidator('json', careerApplicationNoteCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const note = await careerService.addApplicationNote(
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
      const ok = await careerService.removeApplicationNote(
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
    const result = await careerService.listApplicationFiles(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post(
    '/applications/:id/files/create',
    zValidator('json', careerApplicationFileCreateSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const file = await careerService.addApplicationFile(
        userId,
        c.req.param('id'),
        c.req.valid('json'),
      );
      if (!file) throw new NotFoundError('Application not found');
      return c.json(file, 201);
    },
  )
  .post(
    '/applications/:id/files/delete',
    zValidator('json', careerApplicationFileDeleteSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const ok = await careerService.removeApplicationFile(
        userId,
        c.req.param('id'),
        c.req.valid('json').id,
      );
      if (!ok) throw new NotFoundError('Application not found');
      return c.json({ success: true });
    },
  );
