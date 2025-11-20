import { createContext } from './context'
import { appRouter } from './router'

/**
 * Creates a server-side tRPC caller for use in loaders and actions
 * This uses the local router directly without HTTP overhead
 */
export const createCaller = (request: Request) =>
  appRouter.createCaller(() => createContext(request))
