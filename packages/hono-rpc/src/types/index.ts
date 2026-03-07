import type {
	getTask,
	listTasks,
} from '@hominem/db/services/tasks.service'
import type {
	getTag,
	listTags,
} from '@hominem/db/services/tags.service'
import type {
	getEvent,
	listEvents,
	listEventAttendees,
} from '@hominem/db/services/calendar.service'
import type {
	getPerson,
	listPersons,
	listPersonRelations,
} from '@hominem/db/services/persons.service'
import type {
	getBookmark,
	listBookmarks,
} from '@hominem/db/services/bookmarks.service'
import type {
	getPossession,
	listPossessions,
	getContainer,
	listContainers,
} from '@hominem/db/services/possessions.service'

/**
 * Barrel file for @hominem/hono-rpc types
 *
 * This file re-exports the public type definitions for the RPC surface so consumers
 * can import from '@hominem/hono-rpc/types'.
 *
 * Keep this list in sync with the files present in this directory. Prefer exporting
 * the top-level aggregates (e.g. `finance.types`) when they exist to avoid duplicate
 * exports across multiple modules.
 */

/* Core RPC type groups */
export * from './admin.types'
export * from './auth.types'
export * from './chat.types'
export * from './finance.types'
export * from './goals.types'
export * from './invites.types'
export * from './items.types'
export * from './lists.types'
export * from './mobile.types'
export * from './notes.types'
export * from './people.types'
export * from './places.types'
export * from './trips.types'
export * from './tweet.types'
export * from './twitter.types'
export * from './user.types'

/* Utility types */
export * from './utils'

/* Phase 2 service-derived domain types */
export type Task = NonNullable<Awaited<ReturnType<typeof getTask>>>
export type TaskList = Awaited<ReturnType<typeof listTasks>>

export type Tag = NonNullable<Awaited<ReturnType<typeof getTag>>>
export type TagList = Awaited<ReturnType<typeof listTags>>

export type CalendarEvent = NonNullable<Awaited<ReturnType<typeof getEvent>>>
export type CalendarEventList = Awaited<ReturnType<typeof listEvents>>
export type CalendarAttendeeList = Awaited<ReturnType<typeof listEventAttendees>>

export type Person = NonNullable<Awaited<ReturnType<typeof getPerson>>>
export type PersonList = Awaited<ReturnType<typeof listPersons>>
export type PersonRelationList = Awaited<ReturnType<typeof listPersonRelations>>

export type Bookmark = NonNullable<Awaited<ReturnType<typeof getBookmark>>>
export type BookmarkList = Awaited<ReturnType<typeof listBookmarks>>

export type Possession = NonNullable<Awaited<ReturnType<typeof getPossession>>>
export type PossessionList = Awaited<ReturnType<typeof listPossessions>>
export type PossessionContainer = NonNullable<Awaited<ReturnType<typeof getContainer>>>
export type PossessionContainerList = Awaited<ReturnType<typeof listContainers>>
