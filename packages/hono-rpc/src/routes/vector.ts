import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { VectorService } from '@hominem/services/vector';
import { fileStorageService } from '@hominem/utils/supabase';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const searchVectorsSchema = z.object({
  query: z.string().min(1, 'Query string is required'),
  source: z.string().min(1, 'Source is required'),
  limit: z.number().optional().default(10),
});

const searchUserVectorsSchema = z.object({
  query: z.string().min(1, 'Query string is required'),
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.7),
});

const getUserVectorsSchema = z.object({
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

const ingestTextSchema = z.object({
  text: z.string().min(1, 'Text content is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const vectorRoutes = new Hono<AppContext>()
  // ========================================
  // VECTOR SEARCH OPERATIONS
  // ========================================

  // Search vector store by similarity
  .get('/search', authMiddleware, async (c) => {
    try {
      const query = c.req.query();
      const parsed = searchVectorsSchema.safeParse({
        query: query.query,
        source: query.source,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
      }

      const { results } = await VectorService.query({
        q: parsed.data.query,
        source: parsed.data.source,
        limit: parsed.data.limit,
      });

      return c.json({ results, count: results.length || 0 });
    } catch (err) {
      console.error('[vector.searchVectors] error:', err);
      throw new InternalError(
        `Failed to search vector store: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // Search user's vector documents by similarity
  .get('/user/search', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query();
      const parsed = searchUserVectorsSchema.safeParse({
        query: query.query,
        limit: query.limit ? parseInt(query.limit) : undefined,
        threshold: query.threshold ? parseFloat(query.threshold) : undefined,
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
      }

      const { results } = await VectorService.searchDocumentsByUser(
        parsed.data.query,
        userId,
        parsed.data.limit,
        parsed.data.threshold,
      );

      return c.json({ results, count: results.length || 0 });
    } catch (err) {
      console.error('[vector.searchUserVectors] error:', err);
      throw new InternalError(
        `Failed to search user vectors: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // Get user's vector documents
  .get('/user', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query();
      const parsed = getUserVectorsSchema.safeParse({
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
      }

      const vectors = await VectorService.getUserDocuments(
        userId,
        parsed.data.limit,
        parsed.data.offset,
      );

      return c.json({ vectors, count: vectors.length });
    } catch (err) {
      console.error('[vector.getUserVectors] error:', err);
      throw new InternalError(
        `Failed to get user vectors: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // Delete user's vector documents
  .delete('/user', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const source = c.req.query('source');

      const result = await VectorService.deleteUserDocuments(userId, source);

      return c.json({ success: result.success, message: 'Vector documents deleted successfully' });
    } catch (err) {
      console.error('[vector.deleteUserVectors] error:', err);
      throw new InternalError(
        `Failed to delete user vectors: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // ========================================
  // TEXT INGESTION OPERATIONS
  // ========================================

  // Ingest markdown text into vector store
  .post('/ingest', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = ingestTextSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
      }

      const result = await VectorService.ingestMarkdown(
        parsed.data.text,
        userId,
        parsed.data.metadata,
      );

      return c.json({
        success: result.success,
        chunksProcessed: result.chunksProcessed,
        message: `${result.chunksProcessed} text chunks processed and embedded`,
      });
    } catch (err) {
      console.error('[vector.ingestText] error:', err);
      throw new InternalError(
        `Failed to ingest text: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // ========================================
  // FILE STORAGE OPERATIONS
  // ========================================

  // Get user's uploaded files
  .get('/files', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const files = await fileStorageService.listUserFiles(userId);

      return c.json({ files, count: files.length });
    } catch (err) {
      console.error('[vector.getUserFiles] error:', err);
      throw new InternalError(
        `Failed to get user files: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })

  // Delete user's uploaded file
  .delete('/files/:fileId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        throw new ValidationError('File ID is required');
      }

      const deleted = await fileStorageService.deleteFile(fileId, userId);

      return c.json({
        success: deleted,
        message: deleted ? 'File deleted successfully' : 'File not found',
      });
    } catch (err) {
      console.error('[vector.deleteUserFile] error:', err);
      throw new InternalError(
        `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
