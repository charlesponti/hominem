import { tools as financeTools } from '../finance/finance.tools'
import * as bookmarkTools from './bookmarks.tools'
import * as careerTools from './career.tools'
import * as healthTools from './health.tools'
import * as listTools from './lists.tools'
import * as placeTools from './place.tools'
import * as taskTools from './task.tools'
import * as userTools from './user.tools'

export * from './bookmarks.tools'
export * from './career.tools'
export * from './content.tools'
export * from './health.tools'
export * from './lists.tools'
export * from './place.tools'
export * from './task.tools'
export * from './user.tools'

export const allTools = {
  ...taskTools,
  ...userTools,
  ...careerTools,
  ...financeTools,
  ...bookmarkTools,
  ...listTools,
  ...placeTools,
  ...healthTools,
}
