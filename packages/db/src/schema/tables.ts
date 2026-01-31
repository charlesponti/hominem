/**
 * Table Exports (for Drizzle Query API)
 *
 * This file exports ONLY table definitions (not types) to enable
 * Drizzle's relational query API (db.query.*) while allowing lazy
 * type loading when consumers import from .types.ts files.
 */

// Users & Auth
export { users, account } from './users.schema'
export { verificationToken, token, session } from './auth.schema'

// Company & Organization
export { companies } from './company.schema'

// Content & Knowledge
export { notes } from './notes.schema'
export { content, contentStrategies } from './content.schema'
export { documents } from './documents.schema'
export { bookmark } from './bookmarks.schema'

// Taxonomy
export { tags } from './tags.schema'
export { categories } from './categories.schema'

// Social & Communication
export { contacts } from './contacts.schema'
export { chat, chatMessage } from './chats.schema'

// Calendar & Events
export { events, eventsTags, eventsUsers, eventsTransactions } from './calendar.schema'

// Goals & Planning
export { goals } from './goals.schema'
export { surveys, surveyOptions, surveyVotes } from './surveys.schema'

// Lists & Items
export { list, userLists, listInvite } from './lists.schema'
export { item } from './items.schema'

// Places & Travel
export { place, placeTags, routeWaypoints, transportationRoutes } from './places.schema'
export { trips } from './trips.schema'
export { tripItems } from './trip_items.schema'
export { flight, hotel, transport, activity as travelActivity } from './travel.schema'

// Career & Professional
export { jobs, job_applications, application_stages, work_experiences } from './career.schema'
export { skills, user_skills, job_skills } from './skills.schema'
export { interviews, interview_interviewers } from './interviews.schema'
export { networking_events, networking_event_attendees } from './networking_events.schema'

// Finance
export {
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
} from './finance.schema'

// Media & Entertainment
export { movie, movieViewings } from './movies.schema'
export { artists, userArtists } from './music.schema'

// Health & Activity
export { health } from './health.schema'
export { activities } from './activity.schema'

// Possessions
export { possessions } from './possessions.schema'

// Vector Search
export { vectorDocuments } from './vector-documents.schema'
