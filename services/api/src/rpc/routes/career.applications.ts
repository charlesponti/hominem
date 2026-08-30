import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  addCareerApplicationFile,
  addCareerApplicationNote,
  createCareerApplication,
  getCareerApplicationDetail,
  listCareerApplicationFiles,
  listCareerApplicationNotes,
  listCareerApplications,
  removeCareerApplicationFile,
  removeCareerApplicationNote,
  removeCareerApplication,
  updateCareerApplication,
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
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerApplicationsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', careerApplicationsQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplications(userId, c.req.valid('query'));
    return c.json(result);
  })
  .post('/create', zValidator('json', careerApplicationCreateSchema), async (c) => {
    const created = await createCareerApplication(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerApplicationUpdateSchema), async (c) => {
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerApplication(c.get('auth')!.userId, id, data);
    if (!updated) throw new NotFoundError('Application not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerApplicationDeleteSchema), async (c) => {
    const removed = await removeCareerApplication(c.get('auth')!.userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Application not found');
    return c.json({ removed });
  })
  .get('/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const id = c.req.param('id');
    const result = await getCareerApplicationDetail(userId, id);
    return c.json(result);
  })
  // -- Application notes --
  .get('/:id/notes', async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplicationNotes(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post('/:id/notes/create', zValidator('json', careerApplicationNoteCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const note = await addCareerApplicationNote(
      userId,
      c.req.param('id'),
      c.req.valid('json').content,
    );
    if (!note) throw new NotFoundError('Application not found');
    return c.json(note, 201);
  })
  .post('/:id/notes/delete', zValidator('json', careerApplicationNoteDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const ok = await removeCareerApplicationNote(userId, c.req.param('id'), c.req.valid('json').id);
    if (!ok) throw new NotFoundError('Application not found');
    return c.json({ success: true });
  })
  // -- Application files --
  .get('/:id/files', async (c) => {
    const userId = c.get('auth')!.userId;
    const result = await listCareerApplicationFiles(userId, c.req.param('id'));
    if (!result) throw new NotFoundError('Application not found');
    return c.json(result);
  })
  .post('/:id/files/create', zValidator('json', careerApplicationFileCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const file = await addCareerApplicationFile(userId, c.req.param('id'), c.req.valid('json'));
    if (!file) throw new NotFoundError('Application not found');
    return c.json(file, 201);
  })
  .post('/:id/files/delete', zValidator('json', careerApplicationFileDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const ok = await removeCareerApplicationFile(userId, c.req.param('id'), c.req.valid('json').id);
    if (!ok) throw new NotFoundError('Application not found');
    return c.json({ success: true });
  });
