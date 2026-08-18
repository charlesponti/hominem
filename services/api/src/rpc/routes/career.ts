import { randomUUID } from 'node:crypto';

import { JobImportError, normalizeJobUrl } from '@hominem/career-services';
import { CareerImportRepository, db } from '@hominem/db';
import {
  careerJobImportQueue,
  createImportJob,
  publishImportProgress,
  type CareerImportJob,
  type CareerImportQueuePayload,
} from '@hominem/queues';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  addCareerWishlistCompany,
  addCareerApplicationFile,
  addCareerApplicationNote,
  createCareerCertification,
  createCareerApplication,
  createCareerEducation,
  createCareerEngagement,
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
  listCareerEngagements,
  listCareerProjects,
  listCareerSkills,
  listCareerTestimonials,
  listCareerWishlistCompanies,
  removeCareerApplicationFile,
  removeCareerApplicationNote,
  removeCareerApplication,
  removeCareerCertification,
  removeCareerEngagement,
  removeCareerEducation,
  removeCareerProject,
  removeCareerSkill,
  removeCareerTestimonial,
  removeCareerWishlistCompany,
  saveCareerSocialLinks,
  updateCareerCertification,
  updateCareerApplication,
  updateCareerEducation,
  updateCareerEngagement,
  updateCareerProject,
  updateCareerSkill,
  updateCareerTestimonial,
  updateCareerWishlistCompany,
} from '../../application/career.service';
import {
  careerApplicationFileCreateSchema,
  careerApplicationFileDeleteSchema,
  careerApplicationNoteCreateSchema,
  careerApplicationNoteDeleteSchema,
  careerApplicationsQuerySchema,
  careerApplicationCreateSchema,
  careerApplicationDeleteSchema,
  careerApplicationUpdateSchema,
  careerEngagementCreateSchema,
  careerEngagementDeleteSchema,
  careerEngagementUpdateSchema,
  careerEngagementsQuerySchema,
  careerEducationCreateSchema,
  careerEducationDeleteSchema,
  careerEducationUpdateSchema,
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
  careerWishlistCompaniesQuerySchema,
  careerWishlistCompanyCreateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

const retryableImportErrors = new Set([
  'SOURCE_UNAVAILABLE',
  'EXTRACTION_FAILED',
  'PROVIDER_UNAVAILABLE',
  'IMPORT_TIMEOUT',
]);

function toCareerImportDto(record: Awaited<ReturnType<typeof CareerImportRepository.getById>>) {
  if (!record) return null;
  return {
    id: record.id,
    queueJobId: record.queueJobId,
    status: record.status,
    stage: record.stage,
    progress: record.progress,
    sourceUrl: record.sourceUrl,
    draft: record.draft,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    attempts: record.attempts,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    resolvedAt: record.resolvedAt,
  };
}

export const careerRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/imports', async (c) => {
    const imports = await CareerImportRepository.listOpen(db, c.get('auth')!.userId);
    return c.json({ imports: imports.map(toCareerImportDto) });
  })
  .get('/imports/:id', async (c) => {
    const record = await CareerImportRepository.getById(
      db,
      c.get('auth')!.userId,
      c.req.param('id'),
    );
    return c.json({ import: toCareerImportDto(record) });
  })
  .post('/imports', zValidator('json', z.object({ url: z.string().trim().min(1) })), async (c) => {
    const userId = c.get('auth')!.userId;
    const { url } = c.req.valid('json');
    let normalized: URL;
    try {
      normalized = normalizeJobUrl(url);
    } catch (error) {
      if (error instanceof JobImportError) {
        return c.json(
          { error: error.code.toLowerCase(), code: error.code, message: error.message },
          400,
        );
      }
      throw error;
    }
    const jobId = randomUUID();
    const created = await CareerImportRepository.create(db, {
      ownerUserId: userId,
      sourceUrl: normalized.toString(),
      sourceHost: normalized.hostname,
      queueJobId: jobId,
    });
    const job: CareerImportJob = {
      jobId,
      userId,
      type: 'career-job-import',
      status: 'queued',
      stage: 'queued',
      progress: 0,
      sourceUrl: created.sourceUrl,
      attempt: 0,
      startTime: Date.now(),
    };
    const payload: CareerImportQueuePayload = {
      jobId,
      userId,
      sourceUrl: created.sourceUrl,
      createdAt: Date.now(),
    };

    try {
      await createImportJob(job);
      await careerJobImportQueue.add('career-job-import', payload, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
      await publishImportProgress([job]);
    } catch (error) {
      await CareerImportRepository.update(db, created.id, {
        status: 'failed',
        errorCode: 'QUEUE_UNAVAILABLE',
        errorMessage: 'We couldn’t start the import. Nothing was added—please try again.',
        completedAt: new Date().toISOString(),
      });
      logger.error('[career-import] enqueue failed', {
        error,
        owner_userid: userId,
        importId: created.id,
        jobId,
        sourceHost: normalized.hostname,
      });
      return c.json(
        {
          error: 'queue_unavailable',
          code: 'QUEUE_UNAVAILABLE',
          message: 'We couldn’t start the import. Nothing was added—please try again.',
        },
        503,
      );
    }

    return c.json({ import: toCareerImportDto(created) }, 202);
  })
  .post('/imports/:id/retry', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    if (record.status !== 'failed' || !retryableImportErrors.has(record.errorCode ?? '')) {
      return c.json({ import: toCareerImportDto(record) });
    }

    await CareerImportRepository.update(db, record.id, {
      status: 'queued',
      stage: 'queued',
      progress: 0,
      errorCode: null,
      errorMessage: null,
      completedAt: null,
    });
    const previousQueueJob = await careerJobImportQueue.getJob(record.queueJobId);
    if (previousQueueJob) await previousQueueJob.remove();
    const job: CareerImportJob = {
      jobId: record.queueJobId,
      userId,
      type: 'career-job-import',
      status: 'queued',
      stage: 'queued',
      progress: 0,
      sourceUrl: record.sourceUrl,
      attempt: record.attempts,
      startTime: Date.now(),
    };
    await createImportJob(job);
    await careerJobImportQueue.add(
      'career-job-import',
      {
        jobId: record.queueJobId,
        userId,
        sourceUrl: record.sourceUrl,
        createdAt: Date.now(),
      } satisfies CareerImportQueuePayload,
      { jobId: record.queueJobId, attempts: 3, backoff: { type: 'exponential', delay: 2_000 } },
    );
    await publishImportProgress([job]);
    return c.json({
      import: toCareerImportDto(await CareerImportRepository.getById(db, userId, record.id)),
    });
  })
  .post('/imports/:id/dismiss', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    const updated = await CareerImportRepository.update(db, record.id, {
      status: 'dismissed',
      resolvedAt: new Date().toISOString(),
    });
    return c.json({ import: toCareerImportDto(updated) });
  })
  .post('/imports/:id/resolve', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    const updated = await CareerImportRepository.update(db, record.id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    return c.json({ import: toCareerImportDto(updated) });
  })
  .get('/profile', async (c) => {
    const userId = c.get('auth')!.userId;
    const profile = await getCareerProfile(userId);
    return c.json({ profile });
  })
  .get('/engagements', zValidator('query', careerEngagementsQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { type, limit } = c.req.valid('query');
    const result = await listCareerEngagements(userId, { type, limit });
    return c.json(result);
  })
  .post('/engagements/create', zValidator('json', careerEngagementCreateSchema), async (c) => {
    const created = await createCareerEngagement(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/engagements/update', zValidator('json', careerEngagementUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerEngagement(userId, id, data);
    if (!updated) throw new NotFoundError('Engagement not found');
    return c.json(updated);
  })
  .post('/engagements/delete', zValidator('json', careerEngagementDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const removed = await removeCareerEngagement(userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Engagement not found');
    return c.json({ removed });
  })
  .get('/applications', zValidator('query', careerApplicationsQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplications(userId, c.req.valid('query'));
    return c.json(result);
  })
  .post('/applications/create', zValidator('json', careerApplicationCreateSchema), async (c) => {
    const created = await createCareerApplication(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/applications/update', zValidator('json', careerApplicationUpdateSchema), async (c) => {
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerApplication(c.get('auth')!.userId, id, data);
    if (!updated) throw new NotFoundError('Application not found');
    return c.json(updated);
  })
  .post('/applications/delete', zValidator('json', careerApplicationDeleteSchema), async (c) => {
    const removed = await removeCareerApplication(c.get('auth')!.userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Application not found');
    return c.json({ removed });
  })
  .get('/applications/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const id = c.req.param('id');
    const result = await getCareerApplicationDetail(userId, id);
    return c.json(result);
  })
  .get('/wishlist', zValidator('query', careerWishlistCompaniesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerWishlistCompanies(userId, c.req.valid('query').limit));
  })
  .post('/wishlist', zValidator('json', careerWishlistCompanyCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(
      { company: await addCareerWishlistCompany(userId, c.req.valid('json').company) },
      201,
    );
  })
  .patch('/wishlist/:id', zValidator('json', careerWishlistCompanyCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const company = await updateCareerWishlistCompany(
      userId,
      c.req.param('id'),
      c.req.valid('json').company,
    );
    if (!company) throw new NotFoundError('Wishlist company not found');
    return c.json({ company });
  })
  .delete('/wishlist/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const removed = await removeCareerWishlistCompany(userId, c.req.param('id'));
    if (!removed) throw new NotFoundError('Wishlist company not found');
    return c.json({ removed });
  })
  .get('/education', async (c) => {
    const userId = c.get('auth')!.userId;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await listCareerEducation(userId, limit);
    return c.json(result);
  })
  .post('/education/create', zValidator('json', careerEducationCreateSchema), async (c) => {
    const created = await createCareerEducation(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/education/update', zValidator('json', careerEducationUpdateSchema), async (c) => {
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerEducation(c.get('auth')!.userId, id, data);
    if (!updated) throw new NotFoundError('Education not found');
    return c.json(updated);
  })
  .post('/education/delete', zValidator('json', careerEducationDeleteSchema), async (c) => {
    const removed = await removeCareerEducation(c.get('auth')!.userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Education not found');
    return c.json({ removed });
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
    const removed = await removeCareerProject(userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Project not found');
    return c.json({ removed });
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
