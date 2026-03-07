import { relations } from "drizzle-orm/relations";
import { users, userSessions, userAccounts, taskLists, tasks, goals, userApiKeys, tags, taggedItems, tagShares, persons, userPersonRelations, musicTracks, musicAlbums, musicArtists, musicPlaylists, musicPlaylistTracks, musicLiked, videoChannels, videoSubscriptions, calendarEvents, calendarAttendees, keyResults, financeAccounts, places, travelTrips, travelFlights, travelHotels, careerCompanies, careerJobs, careerApplications, careerInterviews, schools, notes, noteTags, noteShares, bookmarks, possessionContainers, possessions } from "./schema";

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userSessions: many(userSessions),
	userAccounts: many(userAccounts),
	tasks: many(tasks),
	goals: many(goals),
	userApiKeys: many(userApiKeys),
	tags: many(tags),
	tagShares: many(tagShares),
	persons: many(persons),
	userPersonRelations: many(userPersonRelations),
	musicTracks: many(musicTracks),
	musicAlbums: many(musicAlbums),
	musicArtists: many(musicArtists),
	musicPlaylists: many(musicPlaylists),
	musicLikeds: many(musicLiked),
	videoChannels: many(videoChannels),
	videoSubscriptions: many(videoSubscriptions),
	calendarEvents: many(calendarEvents),
	taskLists: many(taskLists),
	financeAccounts: many(financeAccounts),
	places: many(places),
	travelTrips: many(travelTrips),
	travelFlights: many(travelFlights),
	travelHotels: many(travelHotels),
	careerCompanies: many(careerCompanies),
	careerJobs: many(careerJobs),
	careerApplications: many(careerApplications),
	schools: many(schools),
	notes: many(notes),
	noteShares: many(noteShares),
	bookmarks: many(bookmarks),
	possessionContainers: many(possessionContainers),
	possessions: many(possessions),
}));

export const userAccountsRelations = relations(userAccounts, ({one}) => ({
	user: one(users, {
		fields: [userAccounts.userId],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskList: one(taskLists, {
		fields: [tasks.listId],
		references: [taskLists.id]
	}),
	task: one(tasks, {
		fields: [tasks.parentId],
		references: [tasks.id],
		relationName: "tasks_parentId_tasks_id"
	}),
	tasks: many(tasks, {
		relationName: "tasks_parentId_tasks_id"
	}),
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id]
	}),
}));

export const taskListsRelations = relations(taskLists, ({one, many}) => ({
	tasks: many(tasks),
	user: one(users, {
		fields: [taskLists.userId],
		references: [users.id]
	}),
}));

export const goalsRelations = relations(goals, ({one, many}) => ({
	user: one(users, {
		fields: [goals.userId],
		references: [users.id]
	}),
	keyResults: many(keyResults),
}));

export const userApiKeysRelations = relations(userApiKeys, ({one}) => ({
	user: one(users, {
		fields: [userApiKeys.userId],
		references: [users.id]
	}),
}));

export const tagsRelations = relations(tags, ({one, many}) => ({
	user: one(users, {
		fields: [tags.ownerId],
		references: [users.id]
	}),
	taggedItems: many(taggedItems),
	noteTags: many(noteTags),
	tagShares: many(tagShares),
}));

export const taggedItemsRelations = relations(taggedItems, ({one}) => ({
	tag: one(tags, {
		fields: [taggedItems.tagId],
		references: [tags.id]
	}),
}));

export const tagSharesRelations = relations(tagShares, ({one}) => ({
	user: one(users, {
		fields: [tagShares.sharedWithUserId],
		references: [users.id]
	}),
	tag: one(tags, {
		fields: [tagShares.tagId],
		references: [tags.id]
	}),
}));

export const personsRelations = relations(persons, ({one, many}) => ({
	user: one(users, {
		fields: [persons.ownerUserId],
		references: [users.id]
	}),
	userPersonRelations: many(userPersonRelations),
	calendarAttendees: many(calendarAttendees),
}));

export const userPersonRelationsRelations = relations(userPersonRelations, ({one}) => ({
	person: one(persons, {
		fields: [userPersonRelations.personId],
		references: [persons.id]
	}),
	user: one(users, {
		fields: [userPersonRelations.userId],
		references: [users.id]
	}),
}));

export const musicTracksRelations = relations(musicTracks, ({one, many}) => ({
	user: one(users, {
		fields: [musicTracks.userId],
		references: [users.id]
	}),
	musicPlaylistTracks: many(musicPlaylistTracks),
	musicLikeds: many(musicLiked),
}));

export const musicAlbumsRelations = relations(musicAlbums, ({one}) => ({
	user: one(users, {
		fields: [musicAlbums.userId],
		references: [users.id]
	}),
}));

export const musicArtistsRelations = relations(musicArtists, ({one}) => ({
	user: one(users, {
		fields: [musicArtists.userId],
		references: [users.id]
	}),
}));

export const musicPlaylistsRelations = relations(musicPlaylists, ({one, many}) => ({
	user: one(users, {
		fields: [musicPlaylists.userId],
		references: [users.id]
	}),
	musicPlaylistTracks: many(musicPlaylistTracks),
}));

export const musicPlaylistTracksRelations = relations(musicPlaylistTracks, ({one}) => ({
	musicPlaylist: one(musicPlaylists, {
		fields: [musicPlaylistTracks.playlistId],
		references: [musicPlaylists.id]
	}),
	musicTrack: one(musicTracks, {
		fields: [musicPlaylistTracks.trackId],
		references: [musicTracks.id]
	}),
}));

export const musicLikedRelations = relations(musicLiked, ({one}) => ({
	musicTrack: one(musicTracks, {
		fields: [musicLiked.trackId],
		references: [musicTracks.id]
	}),
	user: one(users, {
		fields: [musicLiked.userId],
		references: [users.id]
	}),
}));

export const videoChannelsRelations = relations(videoChannels, ({one, many}) => ({
	user: one(users, {
		fields: [videoChannels.userId],
		references: [users.id]
	}),
	videoSubscriptions: many(videoSubscriptions),
}));

export const videoSubscriptionsRelations = relations(videoSubscriptions, ({one}) => ({
	videoChannel: one(videoChannels, {
		fields: [videoSubscriptions.channelId],
		references: [videoChannels.id]
	}),
	user: one(users, {
		fields: [videoSubscriptions.userId],
		references: [users.id]
	}),
}));

export const calendarEventsRelations = relations(calendarEvents, ({one, many}) => ({
	user: one(users, {
		fields: [calendarEvents.userId],
		references: [users.id]
	}),
	calendarAttendees: many(calendarAttendees),
}));

export const calendarAttendeesRelations = relations(calendarAttendees, ({one}) => ({
	calendarEvent: one(calendarEvents, {
		fields: [calendarAttendees.eventId],
		references: [calendarEvents.id]
	}),
	person: one(persons, {
		fields: [calendarAttendees.personId],
		references: [persons.id]
	}),
}));

export const keyResultsRelations = relations(keyResults, ({one}) => ({
	goal: one(goals, {
		fields: [keyResults.goalId],
		references: [goals.id]
	}),
}));

export const financeAccountsRelations = relations(financeAccounts, ({one}) => ({
	user: one(users, {
		fields: [financeAccounts.userId],
		references: [users.id]
	}),
}));

export const placesRelations = relations(places, ({one}) => ({
	user: one(users, {
		fields: [places.userId],
		references: [users.id]
	}),
}));

export const travelTripsRelations = relations(travelTrips, ({one, many}) => ({
	user: one(users, {
		fields: [travelTrips.userId],
		references: [users.id]
	}),
	travelFlights: many(travelFlights),
	travelHotels: many(travelHotels),
}));

export const travelFlightsRelations = relations(travelFlights, ({one}) => ({
	travelTrip: one(travelTrips, {
		fields: [travelFlights.tripId],
		references: [travelTrips.id]
	}),
	user: one(users, {
		fields: [travelFlights.userId],
		references: [users.id]
	}),
}));

export const travelHotelsRelations = relations(travelHotels, ({one}) => ({
	travelTrip: one(travelTrips, {
		fields: [travelHotels.tripId],
		references: [travelTrips.id]
	}),
	user: one(users, {
		fields: [travelHotels.userId],
		references: [users.id]
	}),
}));

export const careerCompaniesRelations = relations(careerCompanies, ({one, many}) => ({
	user: one(users, {
		fields: [careerCompanies.userId],
		references: [users.id]
	}),
	careerJobs: many(careerJobs),
}));

export const careerJobsRelations = relations(careerJobs, ({one, many}) => ({
	careerCompany: one(careerCompanies, {
		fields: [careerJobs.companyId],
		references: [careerCompanies.id]
	}),
	user: one(users, {
		fields: [careerJobs.userId],
		references: [users.id]
	}),
	careerApplications: many(careerApplications),
}));

export const careerApplicationsRelations = relations(careerApplications, ({one, many}) => ({
	careerJob: one(careerJobs, {
		fields: [careerApplications.jobId],
		references: [careerJobs.id]
	}),
	user: one(users, {
		fields: [careerApplications.userId],
		references: [users.id]
	}),
	careerInterviews: many(careerInterviews),
}));

export const careerInterviewsRelations = relations(careerInterviews, ({one}) => ({
	careerApplication: one(careerApplications, {
		fields: [careerInterviews.applicationId],
		references: [careerApplications.id]
	}),
}));

export const schoolsRelations = relations(schools, ({one}) => ({
	user: one(users, {
		fields: [schools.userId],
		references: [users.id]
	}),
}));

export const notesRelations = relations(notes, ({one, many}) => ({
	user: one(users, {
		fields: [notes.userId],
		references: [users.id]
	}),
	noteTags: many(noteTags),
	noteShares: many(noteShares),
}));

export const noteTagsRelations = relations(noteTags, ({one}) => ({
	note: one(notes, {
		fields: [noteTags.noteId],
		references: [notes.id]
	}),
	tag: one(tags, {
		fields: [noteTags.tagId],
		references: [tags.id]
	}),
}));

export const noteSharesRelations = relations(noteShares, ({one}) => ({
	note: one(notes, {
		fields: [noteShares.noteId],
		references: [notes.id]
	}),
	user: one(users, {
		fields: [noteShares.sharedWithUserId],
		references: [users.id]
	}),
}));

export const bookmarksRelations = relations(bookmarks, ({one}) => ({
	user: one(users, {
		fields: [bookmarks.userId],
		references: [users.id]
	}),
}));

export const possessionContainersRelations = relations(possessionContainers, ({one, many}) => ({
	user: one(users, {
		fields: [possessionContainers.userId],
		references: [users.id]
	}),
	possessions: many(possessions),
}));

export const possessionsRelations = relations(possessions, ({one}) => ({
	possessionContainer: one(possessionContainers, {
		fields: [possessions.containerId],
		references: [possessionContainers.id]
	}),
	user: one(users, {
		fields: [possessions.userId],
		references: [users.id]
	}),
}));
