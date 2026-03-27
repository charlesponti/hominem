import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../../middleware/auth';
import { FilesHandlers } from './handlers';
import { filesService } from './service';

const handlers = new FilesHandlers(filesService);

// =============================================================================
// Router — mounts handlers and applies middleware
// =============================================================================

export const filesRoutes = new Hono<AppContext>()
  .get('/', authMiddleware, (c) => handlers.list(c))
  .get('/:fileId', authMiddleware, (c) => handlers.get(c))
  .get('/:fileId/url', authMiddleware, (c) => handlers.getUrl(c))
  .delete('/:fileId', authMiddleware, (c) => handlers.delete(c))
  .post('/upload_url', authMiddleware, (c) => handlers.getUploadUrl(c))
  .post('/register', authMiddleware, (c) => handlers.register(c))
  .post('/:fileId/reprocess', authMiddleware, (c) => handlers.reprocess(c));
