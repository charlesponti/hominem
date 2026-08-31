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

// Stitches together the career sub-routers, same idea as ./finance.ts. This
// used to be one 554-line file with 48 chained Hono methods, and that was the
// slowest file in the whole typecheck -- TS has to re-check the entire
// accumulated route type on every chained call, so it blows up as the chain
// grows. Splitting into small sub-routers (mirroring packages/db's own repo
// split) keeps each one cheap to typecheck.
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
