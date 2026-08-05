import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('/auth', 'routes/auth/index.tsx'),
  route('/login', 'routes/login.tsx'),
  route('health', 'routes/health.ts'),
  route('api/portfolio/:owner_userid', 'routes/api.portfolio.$userId.ts'),
  route('api/resume/convert', 'routes/api.resume.convert.ts'),
  route('api/resume/customize', 'routes/api.resume.customize.ts'),
  route('api/skills/derive', 'routes/api.skills.derive.ts'),
  route('api/skills/search', 'routes/api.skills.search.ts'),
  route('api/validate-slug', 'routes/api.validate-slug.ts'),
  route('api/job/scrape', 'routes/api.job.scrape.ts'),
  route('p/:slug', 'routes/p.$slug.tsx'),
  layout('routes/_authenticated.tsx', [
    layout('routes/_authenticated-pages.tsx', [
      route('account', 'routes/account.tsx'),
      layout('routes/_portfolio-required.tsx', [
        route('work', 'routes/work.tsx'),
        route('work/:id', 'routes/work.$id.tsx'),
        route('skills', 'routes/skills.tsx'),
        route('projects', 'routes/projects.tsx'),
        route('projects/new', 'routes/projects.new.tsx'),
        route('projects/:id', 'routes/projects.$id.tsx'),
        route('testimonials', 'routes/testimonials.tsx'),
        route('testimonials/new', 'routes/testimonials.new.tsx'),
        route('testimonials/:id', 'routes/testimonials.$id.tsx'),
        route('applications', 'routes/applications.tsx'),
        route('applications/:id', 'routes/applications.$id.tsx', [
          index('routes/applications.$id._index.tsx'),
          route('timeline', 'routes/applications.$id.timeline.tsx'),
          route('notes', 'routes/applications.$id.notes.tsx'),
          route('files', 'routes/applications.$id.files.tsx'),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
