import { relations } from "drizzle-orm/relations";
import { events, eventsTransactions, transactions, users, account, transport, list, bookmark, flight, item, movie, movieViewings, mcpToolExecutions, mcpSessions, tasks, chat, hotel, surveys, surveyOptions, surveyVotes, eventsUsers, contacts, eventsTags, betterAuthUser, authSubjects, authDeviceCodes, authPasskeys, authSessions, interviews, interviewInterviewers, budgetCategories, budgetGoals, chatMessage, authRefreshTokens, categories, plaidItems, financeAccounts, jobApplications, companies, betterAuthAccount, betterAuthSession, notes, financialInstitutions, jobs, jobSkills, skills, place, placeTags, transportationRoutes, routeWaypoints, applicationStages, documents, goals, trips, tripItems, networkingEvents, betterAuthApiKey, betterAuthPasskey, possessions, musicPlaylists, musicPlaylistItems, financialSummary, healthMetrics, tags, userSkills, vectorDocuments, workExperiences, networkingEventAttendees, health, userLists, listInvite, userArtists, artists } from "./schema";

export const eventsTransactionsRelations = relations(eventsTransactions, ({one}) => ({
	event: one(events, {
		fields: [eventsTransactions.eventId],
		references: [events.id]
	}),
	transaction: one(transactions, {
		fields: [eventsTransactions.transactionId],
		references: [transactions.id]
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	eventsTransactions: many(eventsTransactions),
	eventsUsers: many(eventsUsers),
	eventsTags: many(eventsTags),
	place: one(place, {
		fields: [events.placeId],
		references: [place.id]
	}),
	event: one(events, {
		fields: [events.parentEventId],
		references: [events.id],
		relationName: "events_parentEventId_events_id"
	}),
	events: many(events, {
		relationName: "events_parentEventId_events_id"
	}),
	user: one(users, {
		fields: [events.userId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	eventsTransactions: many(eventsTransactions),
	financeAccount_fromAccountId: one(financeAccounts, {
		fields: [transactions.fromAccountId],
		references: [financeAccounts.id],
		relationName: "transactions_fromAccountId_financeAccounts_id"
	}),
	financeAccount_toAccountId: one(financeAccounts, {
		fields: [transactions.toAccountId],
		references: [financeAccounts.id],
		relationName: "transactions_toAccountId_financeAccounts_id"
	}),
	financeAccount_accountId: one(financeAccounts, {
		fields: [transactions.accountId],
		references: [financeAccounts.id],
		relationName: "transactions_accountId_financeAccounts_id"
	}),
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user_userId: one(users, {
		fields: [account.userId],
		references: [users.id],
		relationName: "account_userId_users_id"
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	accounts_userId: many(account, {
		relationName: "account_userId_users_id"
	}),
	transports: many(transport),
	bookmarks: many(bookmark),
	flights: many(flight),
	items: many(item),
	movieViewings: many(movieViewings),
	mcpToolExecutions: many(mcpToolExecutions),
	mcpSessions: many(mcpSessions),
	tasks: many(tasks),
	chats: many(chat),
	hotels: many(hotel),
	surveyVotes: many(surveyVotes),
	betterAuthUser: one(betterAuthUser, {
		fields: [users.betterAuthUserId],
		references: [betterAuthUser.id]
	}),
	authSubjects: many(authSubjects),
	authPasskeys: many(authPasskeys),
	authSessions: many(authSessions),
	budgetGoals: many(budgetGoals),
	chatMessages: many(chatMessage),
	categories: many(categories),
	lists: many(list),
	financeAccounts: many(financeAccounts),
	interviews: many(interviews),
	notes: many(notes),
	plaidItems: many(plaidItems),
	surveys: many(surveys),
	documents: many(documents),
	transactions: many(transactions),
	budgetCategories: many(budgetCategories),
	goals: many(goals),
	networkingEvents: many(networkingEvents),
	possessions_fromUserId: many(possessions, {
		relationName: "possessions_fromUserId_users_id"
	}),
	possessions_userId: many(possessions, {
		relationName: "possessions_userId_users_id"
	}),
	trips: many(trips),
	contacts: many(contacts),
	financialSummaries: many(financialSummary),
	healthMetrics: many(healthMetrics),
	tags: many(tags),
	events: many(events),
	userSkills: many(userSkills),
	vectorDocuments: many(vectorDocuments),
	workExperiences: many(workExperiences),
	health: many(health),
	jobApplications: many(jobApplications),
	userLists: many(userLists),
	listInvites_invitedUserId: many(listInvite, {
		relationName: "listInvite_invitedUserId_users_id"
	}),
	listInvites_userId: many(listInvite, {
		relationName: "listInvite_userId_users_id"
	}),
	userArtists: many(userArtists),
}));

export const transportRelations = relations(transport, ({one}) => ({
	user: one(users, {
		fields: [transport.userId],
		references: [users.id]
	}),
	list: one(list, {
		fields: [transport.listId],
		references: [list.id]
	}),
}));

export const listRelations = relations(list, ({one, many}) => ({
	transports: many(transport),
	flights: many(flight),
	items: many(item),
	hotels: many(hotel),
	user: one(users, {
		fields: [list.ownerId],
		references: [users.id]
	}),
	userLists: many(userLists),
	listInvites: many(listInvite),
}));

export const bookmarkRelations = relations(bookmark, ({one}) => ({
	user: one(users, {
		fields: [bookmark.userId],
		references: [users.id]
	}),
}));

export const flightRelations = relations(flight, ({one}) => ({
	user: one(users, {
		fields: [flight.userId],
		references: [users.id]
	}),
	list: one(list, {
		fields: [flight.listId],
		references: [list.id]
	}),
}));

export const itemRelations = relations(item, ({one, many}) => ({
	list: one(list, {
		fields: [item.listId],
		references: [list.id]
	}),
	user: one(users, {
		fields: [item.userId],
		references: [users.id]
	}),
	tripItems: many(tripItems),
	places: many(place),
}));

export const movieViewingsRelations = relations(movieViewings, ({one}) => ({
	movie: one(movie, {
		fields: [movieViewings.movieId],
		references: [movie.id]
	}),
	user: one(users, {
		fields: [movieViewings.userId],
		references: [users.id]
	}),
}));

export const movieRelations = relations(movie, ({many}) => ({
	movieViewings: many(movieViewings),
}));

export const mcpToolExecutionsRelations = relations(mcpToolExecutions, ({one}) => ({
	user: one(users, {
		fields: [mcpToolExecutions.userId],
		references: [users.id]
	}),
}));

export const mcpSessionsRelations = relations(mcpSessions, ({one}) => ({
	user: one(users, {
		fields: [mcpSessions.userId],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id]
	}),
}));

export const chatRelations = relations(chat, ({one, many}) => ({
	user: one(users, {
		fields: [chat.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessage),
}));

export const hotelRelations = relations(hotel, ({one}) => ({
	user: one(users, {
		fields: [hotel.userId],
		references: [users.id]
	}),
	list: one(list, {
		fields: [hotel.listId],
		references: [list.id]
	}),
}));

export const surveyOptionsRelations = relations(surveyOptions, ({one, many}) => ({
	survey: one(surveys, {
		fields: [surveyOptions.surveyId],
		references: [surveys.id]
	}),
	surveyVotes: many(surveyVotes),
}));

export const surveysRelations = relations(surveys, ({one, many}) => ({
	surveyOptions: many(surveyOptions),
	surveyVotes: many(surveyVotes),
	user: one(users, {
		fields: [surveys.userId],
		references: [users.id]
	}),
}));

export const surveyVotesRelations = relations(surveyVotes, ({one}) => ({
	surveyOption: one(surveyOptions, {
		fields: [surveyVotes.optionId],
		references: [surveyOptions.id]
	}),
	survey: one(surveys, {
		fields: [surveyVotes.surveyId],
		references: [surveys.id]
	}),
	user: one(users, {
		fields: [surveyVotes.userId],
		references: [users.id]
	}),
}));

export const eventsUsersRelations = relations(eventsUsers, ({one}) => ({
	event: one(events, {
		fields: [eventsUsers.eventId],
		references: [events.id]
	}),
	contact: one(contacts, {
		fields: [eventsUsers.personId],
		references: [contacts.id]
	}),
}));

export const contactsRelations = relations(contacts, ({one, many}) => ({
	eventsUsers: many(eventsUsers),
	interviewInterviewers: many(interviewInterviewers),
	user: one(users, {
		fields: [contacts.userId],
		references: [users.id]
	}),
	networkingEventAttendees: many(networkingEventAttendees),
}));

export const eventsTagsRelations = relations(eventsTags, ({one}) => ({
	event: one(events, {
		fields: [eventsTags.eventId],
		references: [events.id]
	}),
}));

export const betterAuthUserRelations = relations(betterAuthUser, ({many}) => ({
	users: many(users),
	betterAuthAccounts: many(betterAuthAccount),
	betterAuthSessions: many(betterAuthSession),
	betterAuthApiKeys: many(betterAuthApiKey),
	betterAuthPasskeys: many(betterAuthPasskey),
}));

export const authSubjectsRelations = relations(authSubjects, ({one, many}) => ({
	user: one(users, {
		fields: [authSubjects.userId],
		references: [users.id]
	}),
	authDeviceCodes: many(authDeviceCodes),
}));

export const authDeviceCodesRelations = relations(authDeviceCodes, ({one}) => ({
	authSubject: one(authSubjects, {
		fields: [authDeviceCodes.subjectId],
		references: [authSubjects.id]
	}),
}));

export const authPasskeysRelations = relations(authPasskeys, ({one}) => ({
	user: one(users, {
		fields: [authPasskeys.userId],
		references: [users.id]
	}),
}));

export const authSessionsRelations = relations(authSessions, ({one, many}) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id]
	}),
	authRefreshTokens: many(authRefreshTokens),
}));

export const interviewInterviewersRelations = relations(interviewInterviewers, ({one}) => ({
	interview: one(interviews, {
		fields: [interviewInterviewers.interviewId],
		references: [interviews.id]
	}),
	contact: one(contacts, {
		fields: [interviewInterviewers.contactId],
		references: [contacts.id]
	}),
}));

export const interviewsRelations = relations(interviews, ({one, many}) => ({
	interviewInterviewers: many(interviewInterviewers),
	user: one(users, {
		fields: [interviews.userId],
		references: [users.id]
	}),
	jobApplication: one(jobApplications, {
		fields: [interviews.jobApplicationId],
		references: [jobApplications.id]
	}),
	company: one(companies, {
		fields: [interviews.companyId],
		references: [companies.id]
	}),
}));

export const budgetGoalsRelations = relations(budgetGoals, ({one}) => ({
	budgetCategory: one(budgetCategories, {
		fields: [budgetGoals.categoryId],
		references: [budgetCategories.id]
	}),
	user: one(users, {
		fields: [budgetGoals.userId],
		references: [users.id]
	}),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({one, many}) => ({
	budgetGoals: many(budgetGoals),
	user: one(users, {
		fields: [budgetCategories.userId],
		references: [users.id]
	}),
}));

export const chatMessageRelations = relations(chatMessage, ({one}) => ({
	chat: one(chat, {
		fields: [chatMessage.chatId],
		references: [chat.id]
	}),
	user: one(users, {
		fields: [chatMessage.userId],
		references: [users.id]
	}),
}));

export const authRefreshTokensRelations = relations(authRefreshTokens, ({one}) => ({
	authSession: one(authSessions, {
		fields: [authRefreshTokens.sessionId],
		references: [authSessions.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
	possessions_categoryId: many(possessions, {
		relationName: "possessions_categoryId_categories_id"
	}),
}));

export const financeAccountsRelations = relations(financeAccounts, ({one, many}) => ({
	plaidItem: one(plaidItems, {
		fields: [financeAccounts.plaidItemId],
		references: [plaidItems.id]
	}),
	user: one(users, {
		fields: [financeAccounts.userId],
		references: [users.id]
	}),
	transactions_fromAccountId: many(transactions, {
		relationName: "transactions_fromAccountId_financeAccounts_id"
	}),
	transactions_toAccountId: many(transactions, {
		relationName: "transactions_toAccountId_financeAccounts_id"
	}),
	transactions_accountId: many(transactions, {
		relationName: "transactions_accountId_financeAccounts_id"
	}),
}));

export const plaidItemsRelations = relations(plaidItems, ({one, many}) => ({
	financeAccounts: many(financeAccounts),
	financialInstitution: one(financialInstitutions, {
		fields: [plaidItems.institutionId],
		references: [financialInstitutions.id]
	}),
	user: one(users, {
		fields: [plaidItems.userId],
		references: [users.id]
	}),
}));

export const jobApplicationsRelations = relations(jobApplications, ({one, many}) => ({
	interviews: many(interviews),
	applicationStages: many(applicationStages),
	job: one(jobs, {
		fields: [jobApplications.jobId],
		references: [jobs.id]
	}),
	company: one(companies, {
		fields: [jobApplications.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [jobApplications.userId],
		references: [users.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	interviews: many(interviews),
	jobs: many(jobs),
	possessions_brandId: many(possessions, {
		relationName: "possessions_brandId_companies_id"
	}),
	workExperiences: many(workExperiences),
	jobApplications: many(jobApplications),
}));

export const betterAuthAccountRelations = relations(betterAuthAccount, ({one}) => ({
	betterAuthUser: one(betterAuthUser, {
		fields: [betterAuthAccount.userId],
		references: [betterAuthUser.id]
	}),
}));

export const betterAuthSessionRelations = relations(betterAuthSession, ({one}) => ({
	betterAuthUser: one(betterAuthUser, {
		fields: [betterAuthSession.userId],
		references: [betterAuthUser.id]
	}),
}));

export const notesRelations = relations(notes, ({one, many}) => ({
	user: one(users, {
		fields: [notes.userId],
		references: [users.id]
	}),
	note: one(notes, {
		fields: [notes.parentNoteId],
		references: [notes.id],
		relationName: "notes_parentNoteId_notes_id"
	}),
	notes: many(notes, {
		relationName: "notes_parentNoteId_notes_id"
	}),
}));

export const financialInstitutionsRelations = relations(financialInstitutions, ({many}) => ({
	plaidItems: many(plaidItems),
}));

export const jobSkillsRelations = relations(jobSkills, ({one}) => ({
	job: one(jobs, {
		fields: [jobSkills.jobId],
		references: [jobs.id]
	}),
	skill: one(skills, {
		fields: [jobSkills.skillId],
		references: [skills.id]
	}),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	jobSkills: many(jobSkills),
	company: one(companies, {
		fields: [jobs.companyId],
		references: [companies.id]
	}),
	jobApplications: many(jobApplications),
}));

export const skillsRelations = relations(skills, ({many}) => ({
	jobSkills: many(jobSkills),
	userSkills: many(userSkills),
}));

export const placeTagsRelations = relations(placeTags, ({one}) => ({
	place: one(place, {
		fields: [placeTags.placeId],
		references: [place.id]
	}),
}));

export const placeRelations = relations(place, ({one, many}) => ({
	placeTags: many(placeTags),
	item: one(item, {
		fields: [place.itemId],
		references: [item.id]
	}),
	events: many(events),
}));

export const routeWaypointsRelations = relations(routeWaypoints, ({one}) => ({
	transportationRoute: one(transportationRoutes, {
		fields: [routeWaypoints.routeId],
		references: [transportationRoutes.id]
	}),
}));

export const transportationRoutesRelations = relations(transportationRoutes, ({many}) => ({
	routeWaypoints: many(routeWaypoints),
}));

export const applicationStagesRelations = relations(applicationStages, ({one}) => ({
	jobApplication: one(jobApplications, {
		fields: [applicationStages.jobApplicationId],
		references: [jobApplications.id]
	}),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	user: one(users, {
		fields: [documents.userId],
		references: [users.id]
	}),
}));

export const goalsRelations = relations(goals, ({one}) => ({
	user: one(users, {
		fields: [goals.userId],
		references: [users.id]
	}),
}));

export const tripItemsRelations = relations(tripItems, ({one}) => ({
	trip: one(trips, {
		fields: [tripItems.tripId],
		references: [trips.id]
	}),
	item: one(item, {
		fields: [tripItems.itemId],
		references: [item.id]
	}),
}));

export const tripsRelations = relations(trips, ({one, many}) => ({
	tripItems: many(tripItems),
	user: one(users, {
		fields: [trips.userId],
		references: [users.id]
	}),
}));

export const networkingEventsRelations = relations(networkingEvents, ({one, many}) => ({
	user: one(users, {
		fields: [networkingEvents.userId],
		references: [users.id]
	}),
	networkingEventAttendees: many(networkingEventAttendees),
}));

export const betterAuthApiKeyRelations = relations(betterAuthApiKey, ({one}) => ({
	betterAuthUser: one(betterAuthUser, {
		fields: [betterAuthApiKey.userId],
		references: [betterAuthUser.id]
	}),
}));

export const betterAuthPasskeyRelations = relations(betterAuthPasskey, ({one}) => ({
	betterAuthUser: one(betterAuthUser, {
		fields: [betterAuthPasskey.userId],
		references: [betterAuthUser.id]
	}),
}));

export const possessionsRelations = relations(possessions, ({one}) => ({
	company_brandId: one(companies, {
		fields: [possessions.brandId],
		references: [companies.id],
		relationName: "possessions_brandId_companies_id"
	}),
	category_categoryId: one(categories, {
		fields: [possessions.categoryId],
		references: [categories.id],
		relationName: "possessions_categoryId_categories_id"
	}),
	user_fromUserId: one(users, {
		fields: [possessions.fromUserId],
		references: [users.id],
		relationName: "possessions_fromUserId_users_id"
	}),
	user_userId: one(users, {
		fields: [possessions.userId],
		references: [users.id],
		relationName: "possessions_userId_users_id"
	}),
}));

export const musicPlaylistItemsRelations = relations(musicPlaylistItems, ({one}) => ({
	musicPlaylist: one(musicPlaylists, {
		fields: [musicPlaylistItems.playlistId],
		references: [musicPlaylists.id]
	}),
}));

export const musicPlaylistsRelations = relations(musicPlaylists, ({many}) => ({
	musicPlaylistItems: many(musicPlaylistItems),
}));

export const financialSummaryRelations = relations(financialSummary, ({one}) => ({
	user: one(users, {
		fields: [financialSummary.userId],
		references: [users.id]
	}),
}));

export const healthMetricsRelations = relations(healthMetrics, ({one}) => ({
	user: one(users, {
		fields: [healthMetrics.userId],
		references: [users.id]
	}),
}));

export const tagsRelations = relations(tags, ({one}) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id]
	}),
}));

export const userSkillsRelations = relations(userSkills, ({one}) => ({
	user: one(users, {
		fields: [userSkills.userId],
		references: [users.id]
	}),
	skill: one(skills, {
		fields: [userSkills.skillId],
		references: [skills.id]
	}),
}));

export const vectorDocumentsRelations = relations(vectorDocuments, ({one}) => ({
	user: one(users, {
		fields: [vectorDocuments.userId],
		references: [users.id]
	}),
}));

export const workExperiencesRelations = relations(workExperiences, ({one}) => ({
	user: one(users, {
		fields: [workExperiences.userId],
		references: [users.id]
	}),
	company: one(companies, {
		fields: [workExperiences.companyId],
		references: [companies.id]
	}),
}));

export const networkingEventAttendeesRelations = relations(networkingEventAttendees, ({one}) => ({
	networkingEvent: one(networkingEvents, {
		fields: [networkingEventAttendees.networkingEventId],
		references: [networkingEvents.id]
	}),
	contact: one(contacts, {
		fields: [networkingEventAttendees.contactId],
		references: [contacts.id]
	}),
}));

export const healthRelations = relations(health, ({one}) => ({
	user: one(users, {
		fields: [health.userId],
		references: [users.id]
	}),
}));

export const userListsRelations = relations(userLists, ({one}) => ({
	list: one(list, {
		fields: [userLists.listId],
		references: [list.id]
	}),
	user: one(users, {
		fields: [userLists.userId],
		references: [users.id]
	}),
}));

export const listInviteRelations = relations(listInvite, ({one}) => ({
	list: one(list, {
		fields: [listInvite.listId],
		references: [list.id]
	}),
	user_invitedUserId: one(users, {
		fields: [listInvite.invitedUserId],
		references: [users.id],
		relationName: "listInvite_invitedUserId_users_id"
	}),
	user_userId: one(users, {
		fields: [listInvite.userId],
		references: [users.id],
		relationName: "listInvite_userId_users_id"
	}),
}));

export const userArtistsRelations = relations(userArtists, ({one}) => ({
	user: one(users, {
		fields: [userArtists.userId],
		references: [users.id]
	}),
	artist: one(artists, {
		fields: [userArtists.artistId],
		references: [artists.id]
	}),
}));

export const artistsRelations = relations(artists, ({many}) => ({
	userArtists: many(userArtists),
}));