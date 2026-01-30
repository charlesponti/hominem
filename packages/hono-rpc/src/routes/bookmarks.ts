import {
  createBookmarkForUser,
  deleteBookmarkForUser,
  listBookmarksByUser,
  updateBookmarkForUser,
  NotFoundError,
  ValidationError,
  InternalError,
} from '@hominem/services';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

// OpenGraph helper functions (simplified inline)
async function getOpenGraphData({ url }: { url: string }) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hominem/1.0)' },
  });
  const html = await response.text();

  const getMetaContent = (property: string): string => {
    const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
    return match?.[1] || '';
  };

  return {
    ogTitle: getMetaContent('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || '',
    ogDescription: getMetaContent('og:description'),
    ogImage: getMetaContent('og:image'),
    ogSiteName: getMetaContent('og:site_name'),
    ogImageWidth: getMetaContent('og:image:width'),
    ogImageHeight: getMetaContent('og:image:height'),
  };
}

function convertOGContentToBookmark({
  url,
  ogContent,
}: {
  url: string;
  ogContent: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogSiteName?: string;
    ogImageWidth?: string;
    ogImageHeight?: string;
  };
}) {
  return {
    url,
    title: ogContent.ogTitle || new URL(url).hostname,
    description: ogContent.ogDescription || '',
    image: ogContent.ogImage || '',
    siteName: ogContent.ogSiteName || new URL(url).hostname,
    imageWidth: ogContent.ogImageWidth || '',
    imageHeight: ogContent.ogImageHeight || '',
  };
}

const createBookmarkSchema = z.object({
  url: z.string().url(),
});

const updateBookmarkSchema = z.object({
  url: z.string().url(),
});

export const bookmarksRoutes = new Hono<AppContext>()
  // ListOutput bookmarks
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const bookmarks = await listBookmarksByUser(userId);
      return c.json(bookmarks);
    } catch (err) {
      console.error('[bookmarks.list] error:', err);
      throw new InternalError('Failed to list bookmarks');
    }
  })

  // Create bookmark
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = createBookmarkSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
      }

      const { url } = parsed.data;

      let converted: {
        url: string;
        title: string;
        description: string;
        image: string;
        siteName: string;
        imageWidth: string;
        imageHeight: string;
      };

      try {
        const ogContent = await getOpenGraphData({ url });
        converted = convertOGContentToBookmark({ url, ogContent });
      } catch (ogError) {
        // Fallback to basic URL data if OpenGraph fails
        console.warn('OpenGraph fetch failed, using fallback data:', ogError);
        converted = {
          url,
          title: new URL(url).hostname,
          description: '',
          image: '',
          siteName: new URL(url).hostname,
          imageWidth: '',
          imageHeight: '',
        };
      }

      const bookmark = await createBookmarkForUser(userId, converted);
      return c.json(bookmark, 201);
    } catch (err) {
      console.error('[bookmarks.create] error:', err);
      throw new InternalError('Failed to create bookmark');
    }
  })

  // Update bookmark
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = updateBookmarkSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
      }

      const { url } = parsed.data;

      let converted: {
        url: string;
        title: string;
        description: string;
        image: string;
        siteName: string;
        imageWidth: string;
        imageHeight: string;
      };

      try {
        const ogContent = await getOpenGraphData({ url });
        converted = convertOGContentToBookmark({ url, ogContent });
      } catch (ogError) {
        console.warn('OpenGraph fetch failed, using fallback data:', ogError);
        converted = {
          url,
          title: new URL(url).hostname,
          description: '',
          image: '',
          siteName: new URL(url).hostname,
          imageWidth: '',
          imageHeight: '',
        };
      }

      const updatedBookmark = await updateBookmarkForUser(id, userId, converted);

      if (!updatedBookmark) {
        throw new NotFoundError('Bookmark not found or not owned by user');
      }

      return c.json(updatedBookmark);
    } catch (err) {
      console.error('[bookmarks.update] error:', err);
      throw new InternalError('Failed to update bookmark');
    }
  })

  // Delete bookmark
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const deleted = await deleteBookmarkForUser(id, userId);
      return c.json({ success: deleted });
    } catch (err) {
      console.error('[bookmarks.delete] error:', err);
      throw new InternalError('Failed to delete bookmark');
    }
  });
