import { applicationsRouter } from './routers/applications'
import { companyRouter } from './routers/company.router'
import { surveysRouter } from './routers/surveys.router'
import { router } from './trpc'

export const appRouter = router({
  surveys: surveysRouter,
  applications: applicationsRouter,
  company: companyRouter,
})

export type AppRouter = typeof appRouter
