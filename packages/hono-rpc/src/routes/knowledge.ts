import { Hono } from 'hono'

import type { AppContext } from '../middleware/auth'

import { bookmarksRoutes } from './bookmarks'
import { filesRoutes } from './files'
import { notesRoutes } from './notes'
import { tasksRoutes } from './tasks'
import { tweetRoutes } from './tweet'
import { twitterRoutes } from './twitter'

/**
 * Knowledge Domain
 *
 * Cognitive output and information management: notes, files, and bookmarks.
 */
export const knowledgeRoutes = new Hono<AppContext>()
  .route('/notes', notesRoutes)
  .route('/tasks', tasksRoutes)
  .route('/files', filesRoutes)
  .route('/bookmarks', bookmarksRoutes)
  .route('/twitter', twitterRoutes)
  .route('/tweet', tweetRoutes)
