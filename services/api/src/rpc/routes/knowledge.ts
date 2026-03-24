import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { bookmarksRoutes } from './bookmarks';
import { filesRoutes } from './files';
import { notesRoutes } from './notes';
import { tagsRoutes } from './tags';
import { tasksRoutes } from './tasks';
import { tweetRoutes } from './tweet';
import { twitterRoutes } from './twitter';

/**
 * Knowledge Domain
 *
 * Cognitive output and information management: notes, tasks, files, bookmarks, and tags.
 */
export const knowledgeRoutes = new Hono<AppContext>()
  .route('/notes', notesRoutes)
  .route('/tasks', tasksRoutes)
  .route('/files', filesRoutes)
  .route('/bookmarks', bookmarksRoutes)
  .route('/tags', tagsRoutes)
  .route('/twitter', twitterRoutes)
  .route('/tweet', tweetRoutes);
