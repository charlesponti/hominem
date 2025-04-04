// General tools
export * from './general'

// Location tools
export * from './location.tools'

// Task management tools
export * from './task.tools'

// User management tools
export * from './user.tools'

// Notes management tools
export * from './notes.tools'

// Job application tools
export * from './career.tools'

// Bookmark tools
export * from './bookmarks.tools'

// List management tools
export * from './lists.tools'

// Place management tools
export * from './place.tools'

// Health tracking tools
export * from './health.tools'

// Travel management tools
export * from './travel.tools'

// Content generation tools
export * as contentTools from './content.tools'

// Tool collections for easier importing
import * as bookmarkTools from './bookmarks.tools'
import * as careerTools from './career.tools'
import * as generalTools from './general'
import * as healthTools from './health.tools'
import * as listTools from './lists.tools'
import * as locationTools from './location.tools'
import * as notesTools from './notes.tools'
import * as placeTools from './place.tools'
import * as taskTools from './task.tools'
import * as travelTools from './travel.tools'
import * as userTools from './user.tools'

// Grouped collections
export const productivityTools = {
  ...taskTools,
  ...notesTools,
  ...listTools,
}

export const userManagementTools = {
  ...userTools,
}

export const locationBasedTools = {
  ...locationTools,
  ...placeTools,
}

export const lifestyleTools = {
  ...careerTools,
  ...healthTools,
  ...bookmarkTools,
}

export const travelPlanningTools = {
  ...travelTools,
  ...locationTools,
}

// Full collection of all tools
export const allTools = {
  ...generalTools,
  ...taskTools,
  ...userTools,
  ...notesTools,
  ...careerTools,
  ...bookmarkTools,
  ...listTools,
  ...placeTools,
  ...healthTools,
  ...travelPlanningTools,
}
