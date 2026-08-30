import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { careerApplicationsRoutes } from './career.applications';
import { careerCertificationsRoutes } from './career.certifications';
import { careerEducationRoutes } from './career.education';
import { careerEngagementsRoutes } from './career.engagements';
import { careerImportsRoutes } from './career.imports';
import { careerProfileRoutes } from './career.profile';
import { careerProjectsRoutes } from './career.projects';
import { careerSkillsRoutes } from './career.skills';
import { careerSocialLinksRoutes } from './career.social-links';
import { careerTestimonialsRoutes } from './career.testimonials';
import { careerWishlistRoutes } from './career.wishlist';

/**
 * Main Career Router
 *
 * Composes all career sub-routers into a single cohesive API, the same way
 * ./finance.ts does. A single Hono instance chaining 40+ handlers forces TS
 * to re-check the whole accumulated route type on every additional chained
 * call (O(n^2) as the chain grows) -- this used to be one 554-line file with
 * 48 chained methods, the most expensive single file in services/api's
 * typecheck. Splitting into small, independently-typed sub-routers (mirrors
 * packages/db's own split: CareerRepository, CareerImportRepository,
 * ApplicationFilesRepository, ApplicationNotesRepository,
 * CertificationRepository, ProjectRepository, SkillRepository,
 * SocialLinksRepository, TestimonialRepository) avoids that.
 */
export const careerRoutes = new Hono<AppContext>()
  .route('/imports', careerImportsRoutes)
  .route('/profile', careerProfileRoutes)
  .route('/engagements', careerEngagementsRoutes)
  .route('/applications', careerApplicationsRoutes)
  .route('/wishlist', careerWishlistRoutes)
  .route('/education', careerEducationRoutes)
  .route('/skills', careerSkillsRoutes)
  .route('/projects', careerProjectsRoutes)
  .route('/testimonials', careerTestimonialsRoutes)
  .route('/certifications', careerCertificationsRoutes)
  .route('/social-links', careerSocialLinksRoutes);
