import { pgTable, index, foreignKey, uuid, uniqueIndex, text, timestamp, integer, unique, numeric, boolean, jsonb, check, varchar, pgPolicy, inet, bigint, real, serial, geometry, json, doublePrecision, vector, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const itemType = pgEnum("ItemType", ['FLIGHT', 'PLACE'])
export const tokenType = pgEnum("TokenType", ['EMAIL', 'API'])
export const accountType = pgEnum("account_type", ['checking', 'savings', 'investment', 'credit', 'loan', 'retirement', 'depository', 'brokerage', 'other'])
export const applicationStageName = pgEnum("application_stage_name", ['Applied', 'Screening', 'Assessment', 'Interview', 'TechnicalTest', 'Offer', 'Hired', 'Rejected', 'Withdrew', 'OnHold'])
export const applicationStageStatus = pgEnum("application_stage_status", ['Pending', 'Scheduled', 'InProgress', 'Completed', 'Skipped', 'Failed', 'Passed'])
export const authDeviceCodeStatus = pgEnum("auth_device_code_status", ['pending', 'approved', 'denied', 'expired'])
export const authProvider = pgEnum("auth_provider", ['apple', 'google', 'passkey'])
export const budgetCategoryType = pgEnum("budget_category_type", ['income', 'expense'])
export const documentType = pgEnum("document_type", ['resume', 'coverLetter', 'sample', 'other'])
export const eventSource = pgEnum("event_source", ['manual', 'google_calendar'])
export const eventType = pgEnum("event_type", ['Transactions', 'Events', 'Birthdays', 'Anniversaries', 'Dates', 'Messages', 'Photos', 'Relationship Start', 'Relationship End', 'Sex', 'Movies', 'Reading', 'Habit', 'Goal', 'Recurring', 'Travel'])
export const institutionStatus = pgEnum("institution_status", ['active', 'error', 'pending_expiration', 'revoked'])
export const interviewFormat = pgEnum("interview_format", ['Phone', 'VideoCall', 'OnSite', 'TakeHomeAssignment', 'Other'])
export const interviewStatus = pgEnum("interview_status", ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'PendingFeedback', 'HIRED', 'REJECTED', 'Pending', 'TURNED_DOWN', 'OFFER'])
export const interviewType = pgEnum("interview_type", ['PhoneScreen', 'Technical', 'Behavioral', 'Panel', 'CaseStudy', 'Final', 'Informational', 'Other'])
export const jobApplicationStatus = pgEnum("job_application_status", ['Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer', 'Screening', 'Interviewing', 'Pending'])
export const jobPostingStatus = pgEnum("job_posting_status", ['draft', 'open', 'closed', 'filled', 'archived'])
export const jobSkillImportance = pgEnum("job_skill_importance", ['Required', 'Preferred', 'Optional', 'NiceToHave'])
export const skillCategory = pgEnum("skill_category", ['Technical', 'Soft', 'Language', 'Tool', 'Framework', 'Other'])
export const skillProficiency = pgEnum("skill_proficiency", ['Beginner', 'Intermediate', 'Advanced', 'Expert'])
export const transactionType = pgEnum("transaction_type", ['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])


export const eventsTransactions = pgTable("events_transactions", {
	eventId: uuid("event_id"),
	transactionId: uuid("transaction_id"),
}, (table) => [
	index("events_transactions_event_id_idx").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")),
	index("events_transactions_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "events_transactions_event_id_events_id_fk"
		}),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "events_transactions_transaction_id_transactions_id_fk"
		}),
]);

export const account = pgTable("account", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	uniqueIndex("Account_provider_providerAccountId_key").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerAccountId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_userId_users_id_fk"
		}),
]);

export const transport = pgTable("transport", {
	id: uuid().primaryKey().notNull(),
	type: text().notNull(),
	departureLocation: text().notNull(),
	arrivalLocation: text().notNull(),
	departureTime: timestamp({ mode: 'string' }).notNull(),
	arrivalTime: timestamp({ mode: 'string' }).notNull(),
	reservationNumber: text(),
	price: text(),
	url: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid().notNull(),
	listId: uuid(),
	sqliteTripId: integer("sqlite_trip_id"),
	sqliteDate: text("sqlite_date"),
	sqliteId: integer("sqlite_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transport_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "transport_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const artists = pgTable("artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	hometown: text(),
	country: text(),
	bandMembers: integer("band_members").default(1).notNull(),
	genres: text().array().notNull(),
	averageTicketPrice: numeric("average_ticket_price", { precision: 10, scale:  2 }).notNull(),
	averagePerformanceAttendance: integer("average_performance_attendance"),
	sellsMerchandise: boolean("sells_merchandise").default(false).notNull(),
	averageMerchandisePrice: numeric("average_merchandise_price", { precision: 10, scale:  2 }),
	imageUrl: text("image_url"),
	websiteUrl: text("website_url"),
	spotifyFollowers: integer("spotify_followers").default(0),
	spotifyUrl: text("spotify_url"),
	spotifyId: text("spotify_id").notNull(),
	spotifyData: jsonb("spotify_data").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("artist_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("genres_idx").using("btree", table.genres.asc().nullsLast().op("array_ops")),
	index("spotify_id_idx").using("btree", table.spotifyId.asc().nullsLast().op("text_ops")),
	unique("artists_slug_unique").on(table.slug),
	unique("artists_spotify_id_unique").on(table.spotifyId),
]);

export const games = pgTable("games", {
	id: integer().primaryKey().notNull(),
	gameTitle: text("game_title"),
	platform: text(),
	releaseYear: integer("release_year"),
});

export const entertainmentBacklog = pgTable("entertainment_backlog", {
	id: integer().primaryKey().notNull(),
	name: text(),
	type: text(),
	series: text(),
	watchDate: text("watch_date"),
});

export const podcastPlays = pgTable("podcast_plays", {
	id: integer().primaryKey().notNull(),
	episodeName: text("episode_name"),
	showName: text("show_name"),
	endTime: text("end_time"),
	msPlayed: integer("ms_played"),
	source: text(),
	spotifyEpisodeUri: text("spotify_episode_uri"),
	spotifyTrackUri: text("spotify_track_uri"),
});

export const bookmark = pgTable("bookmark", {
	id: uuid().primaryKey().notNull(),
	image: text(),
	title: text().notNull(),
	description: text(),
	imageHeight: text(),
	imageWidth: text(),
	locationAddress: text(),
	locationLat: text(),
	locationLng: text(),
	siteName: text().notNull(),
	url: text().notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("bookmark_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bookmark_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const flight = pgTable("flight", {
	id: uuid().primaryKey().notNull(),
	flightNumber: text().notNull(),
	departureAirport: text().notNull(),
	departureDate: timestamp({ mode: 'string' }).notNull(),
	arrivalDate: timestamp({ mode: 'string' }).notNull(),
	arrivalAirport: text().notNull(),
	airline: text().notNull(),
	reservationNumber: text(),
	url: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid().notNull(),
	listId: uuid(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "flight_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "flight_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const item = pgTable("item", {
	id: uuid().primaryKey().notNull(),
	type: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	itemId: uuid().notNull(),
	listId: uuid().notNull(),
	userId: uuid().notNull(),
	itemType: itemType().default('PLACE').notNull(),
}, (table) => [
	index("item_itemId_itemType_idx").using("btree", table.itemId.asc().nullsLast().op("uuid_ops"), table.itemType.asc().nullsLast().op("enum_ops")),
	index("item_listId_idx").using("btree", table.listId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("item_listId_itemId_key").using("btree", table.listId.asc().nullsLast().op("uuid_ops"), table.itemId.asc().nullsLast().op("uuid_ops")),
	index("item_listId_itemType_idx").using("btree", table.listId.asc().nullsLast().op("uuid_ops"), table.itemType.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "item_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "item_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const movieViewings = pgTable("movie_viewings", {
	id: uuid().primaryKey().notNull(),
	movieId: uuid().notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("movie_viewings_movie_id_idx").using("btree", table.movieId.asc().nullsLast().op("uuid_ops")),
	index("movie_viewings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.movieId],
			foreignColumns: [movie.id],
			name: "movie_viewings_movieId_movie_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "movie_viewings_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const movie = pgTable("movie", {
	id: uuid().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	image: text().notNull(),
	director: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
});

export const searches = pgTable("searches", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	query: text(),
	searchTime: text("search_time"),
	interactionUris: text("interaction_uris"),
	source: text(),
});

export const spatialRefSys = pgTable("spatial_ref_sys", {
	srid: integer().primaryKey().notNull(),
	authName: varchar("auth_name", { length: 256 }),
	authSrid: integer("auth_srid"),
	srtext: varchar({ length: 2048 }),
	proj4Text: varchar({ length: 2048 }),
}, (table) => [
	check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
]);

export const mcpToolExecutions = pgTable("mcp_tool_executions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	toolName: varchar("tool_name", { length: 100 }).notNull(),
	parameters: jsonb(),
	result: jsonb(),
	executionTimeMs: integer("execution_time_ms"),
	success: boolean().default(true).notNull(),
	errorMessage: text("error_message"),
	sessionId: uuid("session_id"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_mcp_tool_executions_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_mcp_tool_executions_success").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("idx_mcp_tool_executions_tool_name").using("btree", table.toolName.asc().nullsLast().op("text_ops")),
	index("idx_mcp_tool_executions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mcp_tool_executions_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("mcp_tool_executions_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const mcpSessions = pgTable("mcp_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionToken: varchar("session_token", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_mcp_sessions_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_mcp_sessions_token").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	index("idx_mcp_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mcp_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("mcp_sessions_session_token_key").on(table.sessionToken),
	pgPolicy("mcp_sessions_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
	check("valid_expiry", sql`expires_at > created_at`),
]);

export const gooseDbVersion = pgTable("goose_db_version", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "goose_db_version_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	versionId: bigint("version_id", { mode: "number" }).notNull(),
	isApplied: boolean("is_applied").notNull(),
	tstamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const phoneNumbers = pgTable("phone_numbers", {
	id: integer().primaryKey().notNull(),
	location: text(),
	phoneNumber: text("phone_number"),
});

export const socialMedia = pgTable("social_media", {
	id: integer().primaryKey().notNull(),
	handle: text(),
	platform: text(),
});

export const incomeLog = pgTable("income_log", {
	id: integer().primaryKey().notNull(),
	year: integer(),
	source: text(),
	location: text(),
	grossAmount: real("gross_amount"),
	netAmount: real("net_amount"),
	type: text(),
	taxDetails: text("tax_details"),
});

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text(),
	description: text(),
	status: text().default('todo'),
	priority: text().default('medium'),
	dueDate: timestamp("due_date", { precision: 3, mode: 'string' }),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	sourceId: text("source_id"),
	createdDate: text("created_date"),
	completedDate: text("completed_date"),
	recurrence: text(),
	tags: text(),
	domain: text(),
	project: text(),
	parentId: text("parent_id"),
	estimate: text(),
	attachments: text(),
	rawText: text("raw_text"),
	section: text(),
	sectionId: text("section_id"),
	sourceFile: text("source_file"),
	lineNumber: integer("line_number"),
	extra: jsonb(),
}, (table) => [
	index("tasks_due_date_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("tasks_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("tasks_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("tasks_user_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tasks_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("tasks_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const amazonPurchases = pgTable("amazon_purchases", {
	id: integer().primaryKey().notNull(),
	orderDate: text("order_date"),
	orderId: text("order_id"),
	title: text(),
	category: text(),
	asinIsbn: text("asin_isbn"),
	purchasePricePerUnit: real("purchase_price_per_unit"),
	quantity: integer(),
	shipmentDate: text("shipment_date"),
	shippingAddressName: text("shipping_address_name"),
	shippingAddressStreet1: text("shipping_address_street_1"),
	shippingAddressStreet2: text("shipping_address_street_2"),
	shippingAddressCity: text("shipping_address_city"),
	shippingAddressState: text("shipping_address_state"),
	shippingAddressZip: text("shipping_address_zip"),
	orderStatus: text("order_status"),
	carrierNameAndTrackingNumber: text("carrier_name_and_tracking_number"),
	itemSubtotal: real("item_subtotal"),
	itemSubtotalTax: real("item_subtotal_tax"),
	itemTotal: real("item_total"),
});

export const projects = pgTable("projects", {
	id: integer().primaryKey().notNull(),
	name: text(),
	status: text(),
	dates: text(),
	completion: text(),
	owner: text(),
	priority: text(),
	tasks: text(),
	blockedBy: text("blocked_by"),
	isBlocking: text("is_blocking"),
	summary: text(),
	domain: text(),
	url: text(),
	company: text(),
});

export const creditScores = pgTable("credit_scores", {
	id: integer().primaryKey().notNull(),
	date: text(),
	fico: integer(),
	vantage: integer(),
});

export const objectives = pgTable("objectives", {
	id: integer().primaryKey().notNull(),
	name: text(),
	domain: text(),
});

export const mcpUserContext = pgTable("mcp_user_context", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionId: text("session_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const chat = pgTable("chat", {
	id: uuid().primaryKey().notNull(),
	title: text().notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const hotel = pgTable("hotel", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	checkInDate: timestamp({ mode: 'string' }).notNull(),
	checkOutDate: timestamp({ mode: 'string' }).notNull(),
	reservationNumber: text().notNull(),
	roomType: text().notNull(),
	numberOfGuests: text().notNull(),
	url: text().notNull(),
	phoneNumber: text(),
	price: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid().notNull(),
	listId: uuid(),
	status: text(),
	city: text(),
	state: text(),
	country: text(),
	sqliteHotelName: text("sqlite_hotel_name"),
	sqliteId: integer("sqlite_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "hotel_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "hotel_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const surveyOptions = pgTable("survey_options", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	surveyId: uuid("survey_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.surveyId],
			foreignColumns: [surveys.id],
			name: "survey_options_survey_id_surveys_id_fk"
		}),
]);

export const surveyVotes = pgTable("survey_votes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	optionId: uuid("option_id").notNull(),
	surveyId: uuid("survey_id").notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.optionId],
			foreignColumns: [surveyOptions.id],
			name: "survey_votes_option_id_survey_options_id_fk"
		}),
	foreignKey({
			columns: [table.surveyId],
			foreignColumns: [surveys.id],
			name: "survey_votes_survey_id_surveys_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "survey_votes_user_id_users_id_fk"
		}),
	pgPolicy("survey_votes_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const transportationRoutes = pgTable("transportation_routes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	mode: text().notNull(),
	startLocationId: uuid("start_location_id").notNull(),
	endLocationId: uuid("end_location_id").notNull(),
	location: geometry({ type: "point" }).notNull(),
	duration: integer().notNull(),
	estimatedDistance: integer("estimated_distance").notNull(),
	estimatedTime: integer("estimated_time").notNull(),
});

export const eventsUsers = pgTable("events_users", {
	eventId: uuid("event_id"),
	personId: uuid("person_id"),
}, (table) => [
	index("events_users_event_id_idx").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")),
	index("events_users_person_id_idx").using("btree", table.personId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "events_users_event_id_events_id_fk"
		}),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [contacts.id],
			name: "events_users_person_id_contacts_id_fk"
		}),
]);

export const eventsTags = pgTable("events_tags", {
	eventId: uuid("event_id"),
	tagId: uuid("tag_id"),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "events_tags_event_id_events_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	image: text(),
	supabaseId: text("supabase_id"),
	isAdmin: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	emailVerified: timestamp({ precision: 3, mode: 'string' }),
	photoUrl: text("photo_url"),
	birthday: text(),
	primaryAuthSubjectId: uuid("primary_auth_subject_id"),
	betterAuthUserId: text("better_auth_user_id"),
}, (table) => [
	uniqueIndex("User_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("supabase_id_idx").using("btree", table.supabaseId.asc().nullsLast().op("text_ops")),
	index("users_better_auth_user_id_idx").using("btree", table.betterAuthUserId.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_better_auth_user_id_uidx").using("btree", table.betterAuthUserId.asc().nullsLast().op("text_ops")),
	index("users_primary_auth_subject_id_idx").using("btree", table.primaryAuthSubjectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.betterAuthUserId],
			foreignColumns: [betterAuthUser.id],
			name: "users_better_auth_user_id_better_auth_user_id_fk"
		}).onDelete("set null"),
	unique("users_supabase_id_unique").on(table.supabaseId),
]);

export const authSubjects = pgTable("auth_subjects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: authProvider().notNull(),
	providerSubject: text("provider_subject").notNull(),
	linkedAt: timestamp("linked_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	unlinkedAt: timestamp("unlinked_at", { precision: 3, mode: 'string' }),
	isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => [
	uniqueIndex("auth_subject_provider_subject_uidx").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerSubject.asc().nullsLast().op("text_ops")),
	index("auth_subject_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_subjects_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const authDeviceCodes = pgTable("auth_device_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	deviceCodeHash: text("device_code_hash").notNull(),
	userCode: text("user_code").notNull(),
	clientId: text("client_id").notNull(),
	scope: text(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
	intervalSec: integer("interval_sec").default(5).notNull(),
	status: authDeviceCodeStatus().default('pending').notNull(),
	subjectId: uuid("subject_id"),
}, (table) => [
	uniqueIndex("auth_device_code_hash_uidx").using("btree", table.deviceCodeHash.asc().nullsLast().op("text_ops")),
	uniqueIndex("auth_device_user_code_uidx").using("btree", table.userCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [authSubjects.id],
			name: "auth_device_codes_subject_id_auth_subjects_id_fk"
		}).onDelete("set null"),
]);

export const authPasskeys = pgTable("auth_passkeys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	credentialId: text("credential_id").notNull(),
	publicKey: text("public_key").notNull(),
	signCount: integer("sign_count").default(0).notNull(),
	transports: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { precision: 3, mode: 'string' }),
}, (table) => [
	uniqueIndex("auth_passkey_credential_uidx").using("btree", table.credentialId.asc().nullsLast().op("text_ops")),
	index("auth_passkey_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_passkeys_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const authSessions = pgTable("auth_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionState: text("session_state").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	revokedAt: timestamp("revoked_at", { precision: 3, mode: 'string' }),
	acr: text(),
	amr: text().array(),
	ipHash: text("ip_hash"),
	userAgentHash: text("user_agent_hash"),
}, (table) => [
	index("auth_session_state_idx").using("btree", table.sessionState.asc().nullsLast().op("text_ops")),
	index("auth_session_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const interviewInterviewers = pgTable("interview_interviewers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewId: uuid("interview_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	role: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ii_contact_id_idx").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("ii_interview_id_idx").using("btree", table.interviewId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("interview_interviewer_unique_idx").using("btree", table.interviewId.asc().nullsLast().op("uuid_ops"), table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.interviewId],
			foreignColumns: [interviews.id],
			name: "interview_interviewers_interview_id_interviews_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "interview_interviewers_contact_id_contacts_id_fk"
		}).onDelete("cascade"),
]);

export const budgetGoals = pgTable("budget_goals", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	targetAmount: numeric("target_amount").notNull(),
	currentAmount: numeric("current_amount").notNull(),
	startDate: timestamp("start_date", { precision: 3, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { precision: 3, mode: 'string' }),
	categoryId: uuid("category_id"),
	userId: uuid("user_id").notNull(),
}, (table) => [
	index("budget_goals_search_idx").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [budgetCategories.id],
			name: "budget_goals_category_id_budget_categories_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budget_goals_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("budget_goals_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const chatMessage = pgTable("chat_message", {
	id: uuid().primaryKey().notNull(),
	chatId: uuid().notNull(),
	userId: uuid().notNull(),
	role: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	toolCalls: json(),
	parentMessageId: uuid(),
	messageIndex: text(),
	reasoning: text(),
	files: json(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "chat_message_chatId_chat_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_message_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const authRefreshTokens = pgTable("auth_refresh_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	familyId: uuid("family_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	parentId: uuid("parent_id"),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { precision: 3, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { precision: 3, mode: 'string' }),
}, (table) => [
	index("auth_refresh_family_idx").using("btree", table.familyId.asc().nullsLast().op("uuid_ops")),
	index("auth_refresh_hash_idx").using("btree", table.tokenHash.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [authSessions.id],
			name: "auth_refresh_tokens_session_id_auth_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	domain: text().default('general').notNull(),
	icon: text(),
	color: text(),
	parentId: uuid("parent_id"),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "categories_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("categories_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const list = pgTable("list", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	ownerId: uuid().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean().default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "list_ownerId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	pgPolicy("list_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`("ownerId" = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const financeAccounts = pgTable("finance_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: accountType().notNull(),
	balance: numeric().notNull(),
	interestRate: numeric("interest_rate"),
	minimumPayment: numeric("minimum_payment"),
	name: text().notNull(),
	institutionId: text("institution_id"),
	meta: jsonb(),
	userId: uuid("user_id").notNull(),
	plaidAccountId: text("plaid_account_id"),
	plaidItemId: uuid("plaid_item_id"),
	mask: text(),
	isoCurrencyCode: text("iso_currency_code"),
	subtype: text(),
	officialName: text("official_name"),
	limit: numeric(),
	lastUpdated: timestamp("last_updated", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	sqliteCreditLimit: doublePrecision("sqlite_credit_limit"),
	sqliteActive: boolean("sqlite_active"),
	sqliteId: integer("sqlite_id"),
}, (table) => [
	index("finance_accounts_institution_id_idx").using("btree", table.institutionId.asc().nullsLast().op("text_ops")),
	index("finance_accounts_plaid_item_id_idx").using("btree", table.plaidItemId.asc().nullsLast().op("uuid_ops")),
	index("finance_accounts_search_idx").using("gin", sql`to_tsvector('english'::regconfig, ((name || ' '::text) || COALE`),
	foreignKey({
			columns: [table.plaidItemId],
			foreignColumns: [plaidItems.id],
			name: "finance_accounts_plaid_item_id_plaid_items_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "finance_accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("finance_accounts_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const interviews = pgTable("interviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	jobApplicationId: uuid("job_application_id"),
	companyId: uuid("company_id"),
	type: interviewType(),
	format: interviewFormat(),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	durationMinutes: integer("duration_minutes"),
	location: text(),
	notes: text(),
	feedback: text(),
	thankYouNoteSentAt: timestamp("thank_you_note_sent_at", { mode: 'string' }),
	status: interviewStatus(),
	questionsAsked: jsonb("questions_asked"),
	questionsToAsk: jsonb("questions_to_ask"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	dateApplied: text("date_applied"),
	phoneScreen: text("phone_screen"),
	company: text(),
	extra: jsonb(),
}, (table) => [
	index("interview_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	index("interview_job_app_id_idx").using("btree", table.jobApplicationId.asc().nullsLast().op("uuid_ops")),
	index("interview_scheduled_at_idx").using("btree", table.scheduledAt.asc().nullsLast().op("timestamp_ops")),
	index("interview_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interviews_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.jobApplicationId],
			foreignColumns: [jobApplications.id],
			name: "interviews_job_application_id_job_applications_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "interviews_company_id_companies_id_fk"
		}).onDelete("set null"),
	pgPolicy("interviews_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const financialInstitutions = pgTable("financial_institutions", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	url: text(),
	logo: text(),
	primaryColor: text("primary_color"),
	country: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("financial_institutions_search_idx").using("gin", sql`to_tsvector('english'::regconfig, name)`),
]);

export const betterAuthUser = pgTable("better_auth_user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("better_auth_user_email_uidx").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const personalSizes = pgTable("personal_sizes", {
	id: integer().primaryKey().notNull(),
	type: text(),
	size: text(),
	usSize: text("us_size"),
	ukSize: text("uk_size"),
	mm: real(),
});

export const betterAuthAccount = pgTable("better_auth_account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("better_auth_account_provider_account_uidx").using("btree", table.providerId.asc().nullsLast().op("text_ops"), table.accountId.asc().nullsLast().op("text_ops")),
	index("better_auth_account_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [betterAuthUser.id],
			name: "better_auth_account_user_id_better_auth_user_id_fk"
		}).onDelete("cascade"),
]);

export const betterAuthSession = pgTable("better_auth_session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	uniqueIndex("better_auth_session_token_uidx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("better_auth_session_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [betterAuthUser.id],
			name: "better_auth_session_user_id_better_auth_user_id_fk"
		}).onDelete("cascade"),
]);

export const betterAuthVerification = pgTable("better_auth_verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("better_auth_verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const tarotReadings = pgTable("tarot_readings", {
	id: integer().primaryKey().notNull(),
	date: text(),
	card: text(),
	notes: text(),
});

export const notes = pgTable("notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	content: text(),
	title: text(),
	tags: json().default([]),
	userId: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	analysis: json(),
	type: text().default('note'),
	mentions: json().default([]),
	status: text().default('draft'),
	excerpt: text(),
	publishingMetadata: json("publishing_metadata"),
	parentNoteId: uuid("parent_note_id"),
	versionNumber: integer("version_number").default(1).notNull(),
	isLatestVersion: boolean("is_latest_version").default(true).notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'string' }),
	scheduledFor: timestamp({ precision: 3, mode: 'string' }),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	filePath: text("file_path"),
	section: text(),
	isTask: integer("is_task"),
	isComplete: integer("is_complete"),
	textAnalysis: text("text_analysis"),
	uiScreenType: text("ui_screen_type"),
	userPersona: text("user_persona"),
	industry: text(),
	extra: jsonb(),
}, (table) => [
	index("notes_latest_idx").using("btree", table.isLatestVersion.asc().nullsLast().op("bool_ops")),
	index("notes_parent_idx").using("btree", table.parentNoteId.asc().nullsLast().op("uuid_ops")),
	index("notes_published_at_idx").using("btree", table.publishedAt.asc().nullsLast().op("timestamp_ops")),
	index("notes_search_idx").using("gin", sql`((((setweight(to_tsvector('english'::regconfig, COALESCE(title,`),
	index("notes_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("notes_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("notes_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("notes_version_idx").using("btree", table.parentNoteId.asc().nullsLast().op("uuid_ops"), table.versionNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notes_userId_users_id_fk"
		}),
	foreignKey({
			columns: [table.parentNoteId],
			foreignColumns: [table.id],
			name: "notes_parent_fk"
		}).onDelete("cascade"),
]);

export const keyResults = pgTable("key_results", {
	id: integer().primaryKey().notNull(),
	name: text(),
	objectives: text(),
	category: text(),
	type: text(),
	blockedBy: text("blocked_by"),
	blocking: text(),
	date: text(),
	parentItem: text("parent_item"),
	status: text(),
	subItem: text("sub_item"),
});

export const domains = pgTable("domains", {
	id: integer().primaryKey().notNull(),
	site: text(),
	registrar: text(),
	purchased: text(),
});

export const services = pgTable("services", {
	id: integer().primaryKey().notNull(),
	company: text(),
	address: text(),
	passwordChanged: text("password_changed"),
});

export const plaidItems = pgTable("plaid_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	itemId: text("item_id").notNull(),
	accessToken: text("access_token").notNull(),
	institutionId: text("institution_id").notNull(),
	status: institutionStatus().default('active').notNull(),
	consentExpiresAt: timestamp("consent_expires_at", { precision: 3, mode: 'string' }),
	transactionsCursor: text("transactions_cursor"),
	error: text(),
	lastSyncedAt: timestamp("last_synced_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	index("plaid_items_institution_id_idx").using("btree", table.institutionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.institutionId],
			foreignColumns: [financialInstitutions.id],
			name: "plaid_items_institution_id_financial_institutions_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "plaid_items_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("plaid_items_item_id_unique").on(table.itemId),
	pgPolicy("plaid_items_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const jobSkills = pgTable("job_skills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	skillId: uuid("skill_id").notNull(),
	importanceLevel: jobSkillImportance("importance_level"),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("job_skill_job_id_idx").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("job_skill_skill_id_idx").using("btree", table.skillId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("job_skill_unique_idx").using("btree", table.jobId.asc().nullsLast().op("uuid_ops"), table.skillId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "job_skills_job_id_jobs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.skillId],
			foreignColumns: [skills.id],
			name: "job_skills_skill_id_skills_id_fk"
		}).onDelete("cascade"),
]);

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	website: text().notNull(),
	industry: text().notNull(),
	size: text().notNull(),
	location: text().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
});

export const years = pgTable("years", {
	id: integer().primaryKey().notNull(),
	name: text(),
	locations: text(),
	projects: text(),
});

export const paymentMethods = pgTable("payment_methods", {
	id: integer().primaryKey().notNull(),
	provider: text(),
	paymentMethod: text("payment_method"),
	country: text(),
	postalCode: text("postal_code"),
	creationDate: text("creation_date"),
	source: text(),
});

export const auditLog = pgTable("audit_log", {
	id: integer().primaryKey().notNull(),
	tableName: text("table_name").notNull(),
	recordId: integer("record_id").notNull(),
	action: text().notNull(),
	oldData: text("old_data"),
	newData: text("new_data"),
	changedBy: text("changed_by"),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const accountAliases = pgTable("account_aliases", {
	id: integer().primaryKey().notNull(),
	alias: text().notNull(),
	canonicalName: text("canonical_name").notNull(),
	accountId: integer("account_id"),
	confidenceScore: real("confidence_score").default(1),
	validationCount: integer("validation_count").default(0),
	lastSeenAt: text("last_seen_at"),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("account_aliases_alias_key").on(table.alias),
]);

export const entities = pgTable("entities", {
	id: text().primaryKey().notNull(),
	domain: text().notNull(),
	entityType: text("entity_type").notNull(),
	entitySubtype: text("entity_subtype"),
	title: text().notNull(),
	status: text().default('active'),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
	metadata: text(),
});

export const entityRelationships = pgTable("entity_relationships", {
	id: text().primaryKey().notNull(),
	fromEntityId: text("from_entity_id").notNull(),
	toEntityId: text("to_entity_id").notNull(),
	relationshipType: text("relationship_type").notNull(),
	strength: integer().default(1),
	bidirectional: integer().default(0),
	metadata: text(),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("entity_relationships_from_entity_id_to_entity_id_relationsh_key").on(table.fromEntityId, table.toEntityId, table.relationshipType),
	check("entity_relationships_strength_check", sql`(strength >= 1) AND (strength <= 5)`),
	check("entity_relationships_check", sql`from_entity_id <> to_entity_id`),
]);

export const placeTags = pgTable("place_tags", {
	placeId: uuid("place_id"),
	tagId: uuid("tag_id"),
}, (table) => [
	foreignKey({
			columns: [table.placeId],
			foreignColumns: [place.id],
			name: "place_tags_place_id_place_id_fk"
		}),
]);

export const surveys = pgTable("surveys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "surveys_user_id_users_id_fk"
		}),
	pgPolicy("surveys_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const routeWaypoints = pgTable("route_waypoints", {
	routeId: uuid("route_id"),
	latitude: integer().notNull(),
	longitude: integer().notNull(),
	elevation: integer(),
	timestamp: integer(),
}, (table) => [
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [transportationRoutes.id],
			name: "route_waypoints_route_id_transportation_routes_id_fk"
		}),
]);

export const applicationStages = pgTable("application_stages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobApplicationId: uuid("job_application_id").notNull(),
	stage: applicationStageName().notNull(),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	status: applicationStageStatus(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("app_stage_job_app_id_idx").using("btree", table.jobApplicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobApplicationId],
			foreignColumns: [jobApplications.id],
			name: "application_stages_job_application_id_job_applications_id_fk"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	content: text().notNull(),
	description: text(),
	url: text(),
	type: documentType().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id"),
}, (table) => [
	index("doc_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("doc_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("documents_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: transactionType().notNull(),
	amount: numeric().notNull(),
	date: timestamp({ precision: 3, mode: 'string' }).notNull(),
	description: text(),
	fromAccountId: uuid("from_account_id"),
	toAccountId: uuid("to_account_id"),
	status: text(),
	category: text(),
	parentCategory: text("parent_category"),
	excluded: boolean().default(false),
	tags: text(),
	accountMask: text("account_mask"),
	note: text(),
	recurring: boolean().default(false),
	accountId: uuid("account_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id").notNull(),
	merchantName: text("merchant_name"),
	pending: boolean().default(false),
	paymentChannel: text("payment_channel"),
	location: jsonb(),
	source: text().default('manual'),
	plaidTransactionId: text("plaid_transaction_id"),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector"),
	sqliteId: integer("sqlite_id"),
}, (table) => [
	index("idx_transactions_search_vector").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	index("transactions_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("transactions_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("transactions_from_account_id_idx").using("btree", table.fromAccountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_to_account_id_idx").using("btree", table.toAccountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.fromAccountId],
			foreignColumns: [financeAccounts.id],
			name: "transactions_from_account_id_finance_accounts_id_fk"
		}),
	foreignKey({
			columns: [table.toAccountId],
			foreignColumns: [financeAccounts.id],
			name: "transactions_to_account_id_finance_accounts_id_fk"
		}),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financeAccounts.id],
			name: "transactions_account_id_finance_accounts_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("transactions_plaid_transaction_id_unique").on(table.plaidTransactionId),
	pgPolicy("transactions_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const jobs = pgTable("jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id"),
	title: text().notNull(),
	description: text().notNull(),
	requirements: json().default([]).notNull(),
	salary: text().notNull(),
	location: text().notNull(),
	status: jobPostingStatus().default('draft').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	version: integer().default(1).notNull(),
	currency: text().default('USD').notNull(),
	benefits: json().default([]),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "jobs_company_id_companies_id_fk"
		}),
]);

export const budgetCategories = pgTable("budget_categories", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	type: budgetCategoryType().notNull(),
	budgetId: uuid("budget_id"),
	averageMonthlyExpense: numeric("average_monthly_expense"),
	userId: uuid("user_id").notNull(),
	color: text(),
}, (table) => [
	uniqueIndex("budget_categories_name_user_id_unique").using("btree", table.name.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("budget_categories_search_idx").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budget_categories_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("budget_categories_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const goals = pgTable("goals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	goalCategory: text("goal_category"),
	status: text().default('todo').notNull(),
	priority: integer(),
	milestones: json(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	startDate: timestamp("start_date", { precision: 3, mode: 'string' }),
	dueDate: timestamp("due_date", { precision: 3, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "goals_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("goals_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const searchIndex = pgTable("search_index", {
	entityId: text("entity_id").primaryKey().notNull(),
	domain: text().notNull(),
	entityType: text("entity_type").notNull(),
	title: text().notNull(),
	content: text().default(''),
	tags: text().default(''),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const activityLog = pgTable("activity_log", {
	id: text().primaryKey().notNull(),
	entityId: text("entity_id"),
	action: text().notNull(),
	domain: text().notNull(),
	description: text(),
	metadata: text(),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const calendarEvents = pgTable("calendar_events", {
	id: integer().primaryKey().notNull(),
	calendarName: text("calendar_name").notNull(),
	startTime: text("start_time"),
	endTime: text("end_time"),
	summary: text(),
	location: text(),
	description: text(),
	status: text(),
	uid: text(),
	recurrenceRule: text("recurrence_rule"),
	organizer: text(),
	attendees: text(),
	createdAt: text("created_at"),
	dtstamp: text(),
	lastModified: text("last_modified"),
	eventTypeId: integer("event_type_id"),
	categoryId: integer("category_id"),
	extractedDetail: text("extracted_detail"),
	extractedPerson: text("extracted_person"),
	confidenceScore: real("confidence_score"),
	formatClass: text("format_class"),
});

export const betterAuthDeviceCode = pgTable("better_auth_device_code", {
	id: text().primaryKey().notNull(),
	deviceCode: text("device_code").notNull(),
	userCode: text("user_code").notNull(),
	userId: text("user_id"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	status: text().notNull(),
	lastPolledAt: timestamp("last_polled_at", { mode: 'string' }),
	pollingInterval: integer("polling_interval"),
	clientId: text("client_id"),
	scope: text(),
}, (table) => [
	uniqueIndex("better_auth_device_code_device_uidx").using("btree", table.deviceCode.asc().nullsLast().op("text_ops")),
	index("better_auth_device_code_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("better_auth_device_code_user_uidx").using("btree", table.userCode.asc().nullsLast().op("text_ops")),
]);

export const tripItems = pgTable("trip_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	itemId: uuid("item_id").notNull(),
	day: integer().default(1).notNull(),
	order: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tripId],
			foreignColumns: [trips.id],
			name: "trip_items_trip_id_trips_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [item.id],
			name: "trip_items_item_id_item_id_fk"
		}).onDelete("cascade"),
]);

export const networkingEvents = pgTable("networking_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	type: eventType(),
	date: timestamp({ mode: 'string' }).notNull(),
	location: text(),
	organizer: text(),
	website: text(),
	notes: text(),
	keyTakeaways: text("key_takeaways"),
	attachments: jsonb(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ne_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("ne_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("ne_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "networking_events_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("networking_events_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const betterAuthApiKey = pgTable("better_auth_api_key", {
	id: text().primaryKey().notNull(),
	name: text(),
	start: text(),
	prefix: text(),
	key: text().notNull(),
	userId: text("user_id").notNull(),
	refillInterval: integer("refill_interval"),
	refillAmount: integer("refill_amount"),
	lastRefillAt: timestamp("last_refill_at", { mode: 'string' }),
	enabled: boolean().default(true).notNull(),
	rateLimitEnabled: boolean("rate_limit_enabled").default(true).notNull(),
	rateLimitTimeWindow: integer("rate_limit_time_window"),
	rateLimitMax: integer("rate_limit_max"),
	requestCount: integer("request_count").default(0).notNull(),
	remaining: integer(),
	lastRequest: timestamp("last_request", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	permissions: text(),
	metadata: text(),
}, (table) => [
	index("better_auth_api_key_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	index("better_auth_api_key_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [betterAuthUser.id],
			name: "better_auth_api_key_user_id_better_auth_user_id_fk"
		}).onDelete("cascade"),
]);

export const betterAuthPasskey = pgTable("better_auth_passkey", {
	id: text().primaryKey().notNull(),
	name: text(),
	publicKey: text("public_key").notNull(),
	userId: text("user_id").notNull(),
	credentialId: text("credential_id").notNull(),
	counter: integer().notNull(),
	deviceType: text("device_type").notNull(),
	backedUp: boolean("backed_up").notNull(),
	transports: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	aaguid: text(),
}, (table) => [
	uniqueIndex("better_auth_passkey_credential_uidx").using("btree", table.credentialId.asc().nullsLast().op("text_ops")),
	index("better_auth_passkey_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [betterAuthUser.id],
			name: "better_auth_passkey_user_id_better_auth_user_id_fk"
		}).onDelete("cascade"),
]);

export const possessions = pgTable("possessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	dateAcquired: timestamp("date_acquired", { mode: 'string' }),
	dateSold: timestamp("date_sold", { mode: 'string' }),
	brandId: uuid("brand_id"),
	categoryId: uuid("category_id"),
	purchasePrice: doublePrecision("purchase_price"),
	salePrice: doublePrecision("sale_price"),
	url: text(),
	color: text(),
	imageUrl: text("image_url"),
	modelName: text("model_name"),
	modelNumber: text("model_number"),
	serialNumber: text("serial_number"),
	notes: text(),
	size: text(),
	fromUserId: uuid("from_user_id"),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	tags: jsonb().default([]),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	brand: text(),
	model: text(),
	subCategory: text("sub_category"),
	status: text(),
	acquiredDate: text("acquired_date"),
	retiredDate: text("retired_date"),
	price: doublePrecision(),
	netValue: doublePrecision("net_value"),
	placement: text(),
	artist: text(),
	dailyCost: doublePrecision("daily_cost"),
	daysOwned: integer("days_owned"),
	amount: doublePrecision(),
	amountUnit: text("amount_unit"),
	extra: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [companies.id],
			name: "possessions_brand_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "possessions_category_id_categories_id_fk"
		}),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "possessions_from_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "possessions_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "possessions_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "possessions_from_user_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [companies.id],
			name: "possessions_brand_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "possessions_category_id_fk"
		}).onUpdate("cascade").onDelete("restrict"),
	pgPolicy("possessions_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const musicPlaylists = pgTable("music_playlists", {
	id: integer().primaryKey().notNull(),
	name: text(),
	platform: text(),
	description: text(),
	createdAt: text("created_at"),
});

export const musicPlaylistItems = pgTable("music_playlist_items", {
	id: integer().primaryKey().notNull(),
	playlistId: integer("playlist_id"),
	trackName: text("track_name"),
	artistName: text("artist_name"),
	albumName: text("album_name"),
}, (table) => [
	foreignKey({
			columns: [table.playlistId],
			foreignColumns: [musicPlaylists.id],
			name: "music_playlist_items_playlist_id_fkey"
		}),
]);

export const skills = pgTable("skills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	category: skillCategory(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("skills_name_unique").on(table.name),
]);

export const trips = pgTable("trips", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	city: text(),
	state: text(),
	country: text(),
	people: text(),
	travelDetails: text("travel_details"),
	price: doublePrecision(),
	numOfTravelers: integer("num_of_travelers"),
	locationId: integer("location_id"),
	extra: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trips_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("trips_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const musicListeningLog = pgTable("music_listening_log", {
	id: integer().primaryKey().notNull(),
	timestamp: text(),
	platform: text(),
	trackName: text("track_name"),
	artistName: text("artist_name"),
	albumName: text("album_name"),
	msPlayed: integer("ms_played"),
	reasonStart: text("reason_start"),
	reasonEnd: text("reason_end"),
	shuffle: integer(),
	skipped: integer(),
	interactionType: text("interaction_type"),
});

export const socialLikes = pgTable("social_likes", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	timestamp: text(),
	targetUsername: text("target_username"),
	targetType: text("target_type"),
	reaction: text(),
});

export const socialPosts = pgTable("social_posts", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	postType: text("post_type"),
	caption: text(),
	location: text(),
	timestamp: text(),
	path: text(),
	metadata: text(),
	mediaUrl: text("media_url"),
});

export const socialConnections = pgTable("social_connections", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	connectionType: text("connection_type"),
	username: text(),
	timestamp: text(),
});

export const socialComments = pgTable("social_comments", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	timestamp: text(),
	username: text(),
	text: text(),
});

export const place = pgTable("place", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	address: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	itemId: uuid(),
	googleMapsId: text("google_maps_id"),
	types: text().array(),
	imageUrl: text(),
	phoneNumber: text(),
	rating: doublePrecision(),
	websiteUri: text(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	location: geometry({ type: "point" }).notNull(),
	bestFor: text("best_for"),
	isPublic: boolean("is_public").default(false).notNull(),
	wifiInfo: text("wifi_info"),
	photos: text().array(),
	priceLevel: integer(),
	businessStatus: text("business_status"),
	openingHours: text("opening_hours"),
}, (table) => [
	index("place_itemId_idx").using("btree", table.itemId.asc().nullsLast().op("uuid_ops")),
	index("place_location_gist_idx").using("gist", table.location.asc().nullsLast().op("gist_geometry_ops_2d")),
	index("place_updatedAt_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [item.id],
			name: "place_itemId_item_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("place_google_maps_id_unique").on(table.googleMapsId),
]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	phone: text(),
	linkedinUrl: text("linkedin_url"),
	title: text(),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	name: text(),
	organization: text(),
	sourceFile: text("source_file"),
	extra: jsonb(),
}, (table) => [
	index("contact_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("contact_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contacts_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("contacts_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const financialSummary = pgTable("financial_summary", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	periodType: text("period_type"),
	grossIncome: numeric("gross_income"),
	grossTax: numeric("gross_tax"),
	netIncome: numeric("net_income"),
	housing: numeric(),
	utilities: numeric(),
	place: text(),
	sqliteId: integer("sqlite_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_financial_summary_period").using("btree", table.periodType.asc().nullsLast().op("text_ops")),
	index("idx_financial_summary_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_financial_summary_user"
		}),
	unique("financial_summary_sqlite_id_key").on(table.sqliteId),
]);

export const healthMetrics = pgTable("health_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }),
	metricType: text("metric_type"),
	value: numeric(),
	unit: text(),
	platform: text(),
	sourceFile: text("source_file"),
	sqliteId: integer("sqlite_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_health_metrics_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("idx_health_metrics_type").using("btree", table.metricType.asc().nullsLast().op("text_ops")),
	index("idx_health_metrics_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_health_metrics_user"
		}),
	unique("health_metrics_sqlite_id_key").on(table.sqliteId),
]);

export const socialMessages = pgTable("social_messages", {
	id: integer().primaryKey().notNull(),
	platform: text(),
	timestamp: text(),
	sender: text(),
	receiver: text(),
	text: text(),
	mediaUrl: text("media_url"),
	storyShare: text("story_share"),
	metadata: text(),
});

export const tags = pgTable("tags", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	userId: uuid("user_id"),
	description: text(),
	color: text(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	domain: text(),
	usageCount: integer("usage_count"),
	extra: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tags_user_id_users_id_fk"
		}),
	pgPolicy("tags_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const residences = pgTable("residences", {
	id: integer().primaryKey().notNull(),
	address: text(),
	startDate: text("start_date"),
	endDate: text("end_date"),
	sqft: integer(),
	startRent: real("start_rent"),
	endRent: real("end_rent"),
	contactEmail: text("contact_email"),
	contactNumber: text("contact_number"),
});

export const events = pgTable("events", {
	id: uuid().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	date: timestamp({ mode: 'string' }).notNull(),
	placeId: uuid("place_id"),
	dateStart: timestamp("date_start", { mode: 'string' }),
	dateEnd: timestamp("date_end", { mode: 'string' }),
	dateTime: timestamp("date_time", { mode: 'string' }),
	type: eventType().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	source: eventSource().default('manual').notNull(),
	externalId: text("external_id"),
	calendarId: text("calendar_id"),
	lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
	syncError: text("sync_error"),
	visitNotes: text("visit_notes"),
	visitRating: integer("visit_rating"),
	visitReview: text("visit_review"),
	visitPeople: text("visit_people"),
	interval: text(),
	recurrenceRule: text("recurrence_rule"),
	score: integer(),
	priority: integer(),
	isCompleted: boolean("is_completed").default(false),
	streakCount: integer("streak_count").default(0),
	completedInstances: integer("completed_instances").default(0),
	targetValue: integer("target_value"),
	currentValue: integer("current_value").default(0),
	unit: text(),
	reminderSettings: json("reminder_settings"),
	dependencies: json(),
	resources: json(),
	milestones: json(),
	goalCategory: text("goal_category"),
	parentEventId: uuid("parent_event_id"),
	activityType: text("activity_type"),
	duration: integer(),
	caloriesBurned: integer("calories_burned"),
	status: text().default('active'),
	totalCompletions: integer("total_completions").default(0),
	lastCompletedAt: timestamp("last_completed_at", { mode: 'string' }),
	expiresInDays: integer("expires_in_days"),
	reminderTime: text("reminder_time"),
	isTemplate: boolean("is_template").default(false),
	nextOccurrence: timestamp("next_occurrence", { mode: 'string' }),
	sqliteSummary: text("sqlite_summary"),
	sqlitePeople: text("sqlite_people"),
	sqliteLocation: text("sqlite_location"),
	sqliteTags: text("sqlite_tags"),
	sqliteId: integer("sqlite_id"),
}, (table) => [
	index("events_activity_type_idx").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
	index("events_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("events_external_calendar_unique").using("btree", table.externalId.asc().nullsLast().op("text_ops"), table.calendarId.asc().nullsLast().op("text_ops")),
	index("events_place_id_idx").using("btree", table.placeId.asc().nullsLast().op("uuid_ops")),
	index("events_status_date_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops")),
	index("events_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("events_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("events_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.date.asc().nullsLast().op("timestamp_ops")),
	index("events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.placeId],
			foreignColumns: [place.id],
			name: "events_place_id_place_id_fk"
		}),
	foreignKey({
			columns: [table.parentEventId],
			foreignColumns: [table.id],
			name: "events_parent_event_id_events_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "events_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("events_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const people = pgTable("people", {
	id: integer().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	middleName: text("middle_name"),
	notes: text(),
});

export const userSkills = pgTable("user_skills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	skillId: uuid("skill_id").notNull(),
	proficiencyLevel: skillProficiency("proficiency_level"),
	yearsOfExperience: integer("years_of_experience"),
	lastUsedDate: timestamp("last_used_date", { mode: 'string' }),
	isVerified: boolean("is_verified").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_skill_skill_id_idx").using("btree", table.skillId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("user_skill_unique_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.skillId.asc().nullsLast().op("uuid_ops")),
	index("user_skill_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_skills_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.skillId],
			foreignColumns: [skills.id],
			name: "user_skills_skill_id_skills_id_fk"
		}).onDelete("cascade"),
	pgPolicy("user_skills_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const family = pgTable("family", {
	id: integer().primaryKey().notNull(),
	name: text(),
	relation: text(),
	birthdate: text(),
	birthplace: text(),
});

export const lifeEvents = pgTable("life_events", {
	id: integer().primaryKey().notNull(),
	summary: text(),
	description: text(),
	people: text(),
	location: text(),
	tags: text(),
	dateEnd: text("date_end"),
	city: text(),
	state: text(),
	country: text(),
	startDate: text("start_date"),
});

export const schools = pgTable("schools", {
	id: integer().primaryKey().notNull(),
	name: text(),
	startDate: text("start_date"),
	endDate: text("end_date"),
});

export const careerEmployers = pgTable("career_employers", {
	id: integer().primaryKey().notNull(),
	company: text(),
	position: text(),
	startDate: text("start_date"),
	endDate: text("end_date"),
	startSalary: real("start_salary"),
	endSalary: real("end_salary"),
	currency: text(),
	address: text(),
	phoneNumber: text("phone_number"),
	contactName: text("contact_name"),
});

export const relationships = pgTable("relationships", {
	id: integer().primaryKey().notNull(),
	name: text(),
	dateStarted: text("date_started"),
	kiss: integer(),
	sex: integer(),
	location: text(),
	profession: text(),
	education: text(),
	diet: text(),
	details: text(),
	dateEnded: text("date_ended"),
	attractivenessScore: integer("attractiveness_score"),
	age: integer(),
});

export const financialAccountsSqlite = pgTable("financial_accounts_sqlite", {
	id: integer().primaryKey().notNull(),
	name: text(),
	type: text(),
	creditLimit: real("credit_limit"),
	active: integer(),
});

export const financeExpenses = pgTable("finance_expenses", {
	id: integer().primaryKey().notNull(),
	payee: text(),
	monthlyCost: real("monthly_cost"),
	type: text(),
	billingPeriod: text("billing_period"),
	situation: text(),
	year: integer(),
	category: text(),
	startDate: text("start_date"),
	endDate: text("end_date"),
	annualCost: real("annual_cost"),
});

export const vectorDocuments = pgTable("vector_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	content: text().notNull(),
	metadata: text(),
	embedding: vector({ dimensions: 1536 }),
	userId: uuid("user_id"),
	source: text(),
	sourceType: text("source_type"),
	title: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("vector_documents_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("vector_documents_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("vector_documents_source_type_idx").using("btree", table.sourceType.asc().nullsLast().op("text_ops")),
	index("vector_documents_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "vector_documents_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("vector_documents_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const healthLog = pgTable("health_log", {
	id: integer().primaryKey().notNull(),
	timestamp: text(),
	platform: text(),
	metricType: text("metric_type"),
	value: real(),
	unit: text(),
	sourceFile: text("source_file"),
});

export const healthWeight = pgTable("health_weight", {
	id: integer().primaryKey().notNull(),
	timestamp: text(),
	weightLb: real("weight_lb"),
	fatMassLb: real("fat_mass_lb"),
	boneMassLb: real("bone_mass_lb"),
	muscleMassLb: real("muscle_mass_lb"),
	hydrationLb: real("hydration_lb"),
	comments: text(),
	source: text(),
});

export const healthSleep = pgTable("health_sleep", {
	id: integer().primaryKey().notNull(),
	startTime: text("start_time"),
	endTime: text("end_time"),
	lightSleepSeconds: integer("light_sleep_seconds"),
	deepSleepSeconds: integer("deep_sleep_seconds"),
	remSleepSeconds: integer("rem_sleep_seconds"),
	awakeSeconds: integer("awake_seconds"),
	wakeUpCount: integer("wake_up_count"),
	durationToSleepSeconds: integer("duration_to_sleep_seconds"),
	durationToWakeSeconds: integer("duration_to_wake_seconds"),
	snoringSeconds: integer("snoring_seconds"),
	snoringEpisodes: integer("snoring_episodes"),
	avgHeartRate: integer("avg_heart_rate"),
	minHeartRate: integer("min_heart_rate"),
	maxHeartRate: integer("max_heart_rate"),
	source: text(),
});

export const healthBloodPressure = pgTable("health_blood_pressure", {
	id: integer().primaryKey().notNull(),
	timestamp: text(),
	heartRate: integer("heart_rate"),
	systolic: integer(),
	diastolic: integer(),
	comments: text(),
	source: text(),
});

export const healthHeartRate = pgTable("health_heart_rate", {
	id: integer().primaryKey().notNull(),
	timestamp: text(),
	durationSeconds: text("duration_seconds"),
	bpmValue: text("bpm_value"),
	source: text(),
});

export const locations = pgTable("locations", {
	id: integer().primaryKey().notNull(),
	city: text().notNull(),
	state: text(),
	country: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	continent: text(),
	status: text(),
}, (table) => [
	unique("locations_city_state_country_key").on(table.city, table.state, table.country),
]);

export const workExperiences = pgTable("work_experiences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	companyId: uuid("company_id"),
	title: text().notNull(),
	subtitle: text(),
	description: text().notNull(),
	role: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	image: text(),
	location: text(),
	tags: json().default([]),
	achievements: json().default([]),
	metadata: json(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isVisible: boolean("is_visible").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("work_exp_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	index("work_exp_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("work_exp_sort_order_idx").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("work_exp_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("work_exp_user_sort_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.sortOrder.asc().nullsLast().op("uuid_ops")),
	index("work_exp_user_visible_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.isVisible.asc().nullsLast().op("uuid_ops")),
	index("work_exp_visible_idx").using("btree", table.isVisible.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "work_experiences_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "work_experiences_company_id_companies_id_fk"
		}).onDelete("set null"),
	pgPolicy("work_experiences_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const networkingEventAttendees = pgTable("networking_event_attendees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	networkingEventId: uuid("networking_event_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	notes: text(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	isFollowedUp: boolean("is_followed_up").default(false),
}, (table) => [
	uniqueIndex("ne_attendee_unique_idx").using("btree", table.networkingEventId.asc().nullsLast().op("uuid_ops"), table.contactId.asc().nullsLast().op("uuid_ops")),
	index("nea_contact_id_idx").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("nea_event_id_idx").using("btree", table.networkingEventId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.networkingEventId],
			foreignColumns: [networkingEvents.id],
			name: "networking_event_attendees_networking_event_id_networking_event"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "networking_event_attendees_contact_id_contacts_id_fk"
		}).onDelete("cascade"),
]);

export const health = pgTable("health", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	activityType: text("activity_type").notNull(),
	duration: integer().notNull(),
	caloriesBurned: integer("calories_burned").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("health_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("health_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "health_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("health_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const jobApplications = pgTable("job_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	position: text(),
	resumeDocumentUrl: text("resume_document_url"),
	coverLetterDocumentUrl: text("cover_letter_document_url"),
	startDate: timestamp("start_date", { mode: 'string' }).defaultNow(),
	endDate: timestamp("end_date", { mode: 'string' }),
	link: text(),
	location: text().default('Remote'),
	status: jobApplicationStatus().default('Applied'),
	salaryQuoted: text("salary_quoted"),
	salaryAccepted: text("salary_accepted"),
	jobPosting: text("job_posting"),
	phoneScreen: text("phone_screen"),
	companyId: uuid("company_id"),
	userId: uuid("user_id"),
	jobId: uuid("job_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	hasReference: boolean("has_reference").default(false).notNull(),
	sqliteId: integer("sqlite_id"),
	sourceDb: text("source_db").default('postgres').notNull(),
	company: text(),
	date: text(),
	reference: integer(),
	endStage: text("end_stage"),
	numOfStages: integer("num_of_stages"),
	extra: jsonb(),
}, (table) => [
	index("job_applications_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	index("job_applications_job_id_idx").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("job_applications_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "job_applications_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "job_applications_company_id_companies_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "job_applications_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("job_applications_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);

export const activities = pgTable("activities", {
	id: integer().primaryKey().notNull(),
	tripId: integer("trip_id"),
	date: text(),
	type: text(),
	name: text(),
	location: text(),
	notes: text(),
	details: text(),
});

export const transportationSqlite = pgTable("transportation_sqlite", {
	id: integer().primaryKey().notNull(),
	tripId: integer("trip_id"),
	date: text(),
	type: text(),
	fromLocation: text("from_location"),
	toLocation: text("to_location"),
	cost: real(),
	notes: text(),
	transportationTypeId: integer("transportation_type_id"),
});

export const hotelsSqlite = pgTable("hotels_sqlite", {
	id: integer().primaryKey().notNull(),
	tripId: integer("trip_id"),
	hotelName: text("hotel_name"),
	checkInDate: text("check_in_date"),
	checkOutDate: text("check_out_date"),
	city: text(),
	state: text(),
	country: text(),
	price: real(),
	status: text(),
	numberOfTravelers: integer("number_of_travelers"),
	notes: text(),
	locationId: integer("location_id"),
});

export const readingLog = pgTable("reading_log", {
	id: integer().primaryKey().notNull(),
	name: text(),
	author: text(),
	status: text(),
	dateRead: text("date_read"),
	category: text(),
	cover: text(),
	issue: text(),
	type: text(),
});

export const concerts = pgTable("concerts", {
	id: integer().primaryKey().notNull(),
	artist: text(),
	venue: text(),
	city: text(),
	state: text(),
	date: text(),
});

export const mediaLog = pgTable("media_log", {
	id: integer().primaryKey().notNull(),
	name: text(),
	year: text(),
	letterboxdUri: text("letterboxd_uri"),
	movieId: text("movie_id"),
	sources: text(),
	latestRating: text("latest_rating"),
	allRatings: text("all_ratings"),
	firstWatched: text("first_watched"),
	lastActivity: text("last_activity"),
	rewatchCount: text("rewatch_count"),
	hasReview: text("has_review"),
	allTags: text("all_tags"),
	isWatched: text("is_watched"),
	isInDiary: text("is_in_diary"),
	isRated: text("is_rated"),
	isReviewed: text("is_reviewed"),
	isInWatchlist: text("is_in_watchlist"),
	isLiked: text("is_liked"),
	mediaType: text("media_type"),
	season: integer(),
	episode: integer(),
});

export const notesUnified = pgTable("notes_unified", {
	id: integer().primaryKey().notNull(),
	title: text(),
	content: text(),
	folder: text(),
	sourceFile: text("source_file"),
	createdAt: text("created_at"),
	updatedAt: text("updated_at"),
});

export const activityTypes = pgTable("activity_types", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	category: text(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("activity_types_name_key").on(table.name),
]);

export const mealTypes = pgTable("meal_types", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	category: text().default('Meal'),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("meal_types_name_key").on(table.name),
]);

export const transportationTypes = pgTable("transportation_types", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	category: text().default('Transportation'),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("transportation_types_name_key").on(table.name),
]);

export const tripCategories = pgTable("trip_categories", {
	id: integer().primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	category: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("trip_categories_trip_id_category_key").on(table.tripId, table.category),
]);

export const tripTags = pgTable("trip_tags", {
	id: integer().primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	tag: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("trip_tags_trip_id_tag_key").on(table.tripId, table.tag),
]);

export const possessionsContainers = pgTable("possessions_containers", {
	id: integer().primaryKey().notNull(),
	possessionId: uuid("possession_id"),
	type: text().notNull(),
	label: text(),
	tareWeightG: real("tare_weight_g"),
});

export const possessionsUsage = pgTable("possessions_usage", {
	id: integer().primaryKey().notNull(),
	possessionId: uuid("possession_id"),
	containerId: integer("container_id"),
	type: text(),
	timestamp: text(),
	amount: real(),
	amountUnit: text("amount_unit"),
	method: text(),
	startDate: text("start_date"),
	endDate: text("end_date"),
});

export const googleVideosLog = pgTable("google_videos_log", {
	id: integer().primaryKey().notNull(),
	videoId: text("video_id"),
	creationTimestamp: text("creation_timestamp"),
	sourcePlaylist: text("source_playlist"),
	title: text(),
});

export const schemaMigrations = pgTable("schema_migrations", {
	version: text().primaryKey().notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const financialAccounts = pgTable("financial_accounts", {
	id: integer().primaryKey().notNull(),
	name: text(),
	type: text(),
	creditLimit: real("credit_limit"),
	active: integer(),
});

export const financialLocations = pgTable("financial_locations", {
	id: integer().primaryKey().notNull(),
	place: text(),
	annualGrossIncome: real("annual_gross_income"),
	annualGrossTax: real("annual_gross_tax"),
	annualNetIncome: real("annual_net_income"),
	monthlyGrossIncome: real("monthly_gross_income"),
	housing: real(),
	utilities: real(),
	monthlyNetIncome: real("monthly_net_income"),
});

export const runway = pgTable("runway", {
	id: integer().primaryKey().notNull(),
	date: text(),
	availableFunds: real("available_funds"),
	weight: real(),
});

export const spotifyFollow = pgTable("spotify_follow", {
	id: integer().primaryKey().notNull(),
	followercount: text(),
	followinguserscount: text(),
	followingartists: text(),
});

export const spotifyPayments = pgTable("spotify_payments", {
	id: integer().primaryKey().notNull(),
	paymentMethod: text("payment_method"),
	country: text(),
	postalCode: text("postal_code"),
	creationDate: text("creation_date"),
});

export const googleAccount = pgTable("google_account", {
	id: text().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	password: text(),
	isStaff: text("is_staff"),
	isActive: text("is_active"),
	isSuperuser: text("is_superuser"),
	lastLogin: text("last_login"),
	dateJoined: text("date_joined"),
	mergedWithGaia: text("merged_with_gaia"),
	mergedWithGaiaAt: text("merged_with_gaia_at"),
	ispersisted: text(),
});

export const googleActivitiesAListOfGoogleServicesAccessedBy = pgTable("google_activities_a_list_of_google_services_accessed_by", {
	id: text().primaryKey().notNull(),
	gaiaId: text("gaia_id"),
	activityTimestamp: text("activity_timestamp"),
	ipAddress: text("ip_address"),
	proxiedhostIpAddress: text("proxiedhost_ip_address"),
	isNonRoutableIpAddress: text("is_non_routable_ip_address"),
	activityCountry: text("activity_country"),
	activityRegion: text("activity_region"),
	activityCity: text("activity_city"),
	userAgentString: text("user_agent_string"),
	productName: text("product_name"),
	subProductName: text("sub_product_name"),
	activityType: text("activity_type"),
	gmailAccessChannel: text("gmail_access_channel"),
});

export const googleAustralia = pgTable("google_australia", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleCashbackRewards = pgTable("google_cashback_rewards", {
	id: integer().primaryKey().notNull(),
	date: text(),
	currency: text(),
	rewardAmount: text("reward_amount"),
	rewardsDescription: text("rewards_description"),
});

export const googleChannel = pgTable("google_channel", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
	channelTitleOriginal: text("channel_title_original"),
	channelVisibility: text("channel_visibility"),
});

export const googleChannelCommunityModerationSettings = pgTable("google_channel_community_moderation_settings", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
});

export const googleChannelFeatureData = pgTable("google_channel_feature_data", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
	channelAutoModerationInLiveChat: text("channel_auto_moderation_in_live_chat"),
	videoDefaultAllowedCommentsType: text("video_default_allowed_comments_type"),
	videoDefaultTargetedAudience: text("video_default_targeted_audience"),
	videoDefaultLicense: text("video_default_license"),
	videoDefaultLocationLatitude: text("video_default_location_latitude"),
	videoDefaultLocationLongitude: text("video_default_location_longitude"),
});

export const googleChannelImages = pgTable("google_channel_images", {
	id: integer().primaryKey().notNull(),
	channelImageCreateTimestamp: text("channel_image_create_timestamp"),
	channelImageFullContentUrl: text("channel_image_full_content_url"),
});

export const googleChannelPageSettings = pgTable("google_channel_page_settings", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
});

export const googleChannelUrlConfigs = pgTable("google_channel_url_configs", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
	channelVanityUrl1Name: text("channel_vanity_url_1_name"),
});

export const googleComments = pgTable("google_comments", {
	id: integer().primaryKey().notNull(),
	commentId: text("comment_id"),
	channelId: text("channel_id"),
	commentCreateTimestamp: text("comment_create_timestamp"),
	price: text(),
	parentCommentId: text("parent_comment_id"),
	postId: text("post_id"),
	videoId: text("video_id"),
	commentText: text("comment_text"),
});

export const googleDefaultList = pgTable("google_default_list", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleDevicesAListOfDevicesIENestPixelIph = pgTable("google_devices_a_list_of_devices_i_e_nest_pixel_iph", {
	id: text().primaryKey().notNull(),
	deviceType: text("device_type"),
	brandName: text("brand_name"),
	marketingName: text("marketing_name"),
	os: text(),
	osVersion: text("os_version"),
	deviceModel: text("device_model"),
	userGivenName: text("user_given_name"),
	deviceLastLocation: text("device_last_location"),
	gaiaId: text("gaia_id"),
});

export const googleFavoriteImages = pgTable("google_favorite_images", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleFavoriteJobs = pgTable("google_favorite_jobs", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleInfo = pgTable("google_info", {
	id: integer().primaryKey().notNull(),
	autoreplyformembersinorg: text(),
	autoreplyformembersoutsideorg: text(),
	autoreplyfornonmembersinorg: text(),
	autoreplyfornonmembersoutsideorg: text(),
	customreplyto: text(),
	defaultmessagedenynotificationtext: text(),
	description: text(),
	footer: text(),
	groupemailaddress: text(),
	name: text(),
	subjectprefix: text(),
	welcomemessage: text(),
});

export const googleLiveChats = pgTable("google_live_chats", {
	id: integer().primaryKey().notNull(),
	liveChatId: text("live_chat_id"),
	channelId: text("channel_id"),
	liveChatCreateTimestamp: text("live_chat_create_timestamp"),
	price: text(),
	videoId: text("video_id"),
	liveChatText: text("live_chat_text"),
});

export const googleMembers = pgTable("google_members", {
	id: integer().primaryKey().notNull(),
	displayname: text(),
	email: text(),
	emaildeliverysetting: text(),
	role: text(),
	updatedtimestamp: text(),
});

export const googleMobileDevices = pgTable("google_mobile_devices", {
	id: text().primaryKey().notNull(),
	userid: text(),
	deviceid: text(),
	devicename: text(),
	clientos: text(),
	clientosversion: text(),
	clientappversion: text(),
	clientplatform: text(),
	clientplayservicesversion: text(),
	creationtime: text(),
	reassertiontime: text(),
	ispersisted: text(),
});

export const googleMoneySendsAndRequests = pgTable("google_money_sends_and_requests", {
	id: integer().primaryKey().notNull(),
	time: text(),
	transactionId: text("transaction_id"),
	description: text(),
	memo: text(),
	paymentMethod: text("payment_method"),
	status: text(),
	amount: text(),
});

export const googleMusicLibrarySongs = pgTable("google_music_library_songs", {
	id: integer().primaryKey().notNull(),
	videoId: text("video_id"),
	songTitle: text("song_title"),
	albumTitle: text("album_title"),
	artistName1: text("artist_name_1"),
	artistName2: text("artist_name_2"),
	artistName3: text("artist_name_3"),
	artistName4: text("artist_name_4"),
	artistName5: text("artist_name_5"),
});

export const googleMyCookbook = pgTable("google_my_cookbook", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleMyShoppingList = pgTable("google_my_shopping_list", {
	id: integer().primaryKey().notNull(),
	itemTitle: text("item_title"),
	itemState: text("item_state"),
	itemQuantity: text("item_quantity"),
	itemNotes: text("item_notes"),
});

export const googleNotInterestedSetting = pgTable("google_not_interested_setting", {
	id: integer().primaryKey().notNull(),
	entityName: text("entity_name"),
	settingValue: text("setting_value"),
});

export const googleNotificationTokens = pgTable("google_notification_tokens", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	clientPlatform: text("client_platform"),
	token: text(),
	language: text(),
	useSandbox: text("use_sandbox"),
	cert: text(),
	service: text(),
	sender: text(),
	deviceId: text("device_id"),
	clientAppVersion: text("client_app_version"),
	clientUserAgent: text("client_user_agent"),
	modifiedAt: text("modified_at"),
	bundleId: text("bundle_id"),
	formats: text(),
	ispersisted: text(),
});

export const googlePlaylists = pgTable("google_playlists", {
	id: integer().primaryKey().notNull(),
	playlistId: text("playlist_id"),
	addNewVideosToTop: text("add_new_videos_to_top"),
	playlistDescriptionOriginal: text("playlist_description_original"),
	playlistImage1CreateTimestamp: text("playlist_image_1_create_timestamp"),
	playlistImage1Url: text("playlist_image_1_url"),
	playlistImage1Height: text("playlist_image_1_height"),
	playlistImage1Width: text("playlist_image_1_width"),
	playlistImage2CreateTimestamp: text("playlist_image_2_create_timestamp"),
	playlistImage2Url: text("playlist_image_2_url"),
	playlistImage2Height: text("playlist_image_2_height"),
	playlistImage2Width: text("playlist_image_2_width"),
	playlistImage3CreateTimestamp: text("playlist_image_3_create_timestamp"),
	playlistImage3Url: text("playlist_image_3_url"),
	playlistImage3Height: text("playlist_image_3_height"),
	playlistImage3Width: text("playlist_image_3_width"),
	playlistTitleOriginal: text("playlist_title_original"),
	playlistTitleOriginalLanguage: text("playlist_title_original_language"),
	playlistCreateTimestamp: text("playlist_create_timestamp"),
	playlistUpdateTimestamp: text("playlist_update_timestamp"),
	playlistVideoOrder: text("playlist_video_order"),
	playlistVisibility: text("playlist_visibility"),
});

export const googleProfile = pgTable("google_profile", {
	id: integer().primaryKey().notNull(),
	displayName: text("display_name"),
	email: text(),
	about: text(),
	profilePhotoUrl: text("profile_photo_url"),
	profilePhotoThumbnailUrls: text("profile_photo_thumbnail_urls"),
	city: text(),
	state: text(),
	country: text(),
	industry: text(),
	occupation: text(),
	gender: text(),
	audioClipUrl: text("audio_clip_url"),
	homepageUrl: text("homepage_url"),
	wishlistUrl: text("wishlist_url"),
	interests: text(),
	favoriteMovies: text("favorite_movies"),
	favoriteMusic: text("favorite_music"),
	favoriteBooks: text("favorite_books"),
	wackyQuestion: text("wacky_question"),
	wackyAnswer: text("wacky_answer"),
	imName: text("im_name"),
	imNetwork: text("im_network"),
	adSensePubId: text("ad_sense_pub_id"),
});

export const googleReadingList = pgTable("google_reading_list", {
	id: integer().primaryKey().notNull(),
	title: text(),
	note: text(),
	url: text(),
	comment: text(),
});

export const googleRecentlyViewedDiscussions = pgTable("google_recently_viewed_discussions", {
	id: integer().primaryKey().notNull(),
	discussionUrl: text("discussion_url"),
});

export const googleRecentlyViewedGroups = pgTable("google_recently_viewed_groups", {
	id: integer().primaryKey().notNull(),
	groupEmail: text("group_email"),
});

export const googleSavesData = pgTable("google_saves_data", {
	id: integer().primaryKey().notNull(),
	title: text(),
	playableId: text("playable_id"),
	timestamp: text(),
});

export const googleSubscriptions = pgTable("google_subscriptions", {
	id: integer().primaryKey().notNull(),
	channelId: text("channel_id"),
	channelUrl: text("channel_url"),
	channelTitle: text("channel_title"),
});

export const googleTombstones = pgTable("google_tombstones", {
	id: integer().primaryKey().notNull(),
	deleteRequestTimeUtc: text("delete_request_time_utc"),
	deletionRangeStartTimeUtc: text("deletion_range_start_time_utc"),
	deletionRangeEndTimeUtc: text("deletion_range_end_time_utc"),
});

export const googleYourFollows = pgTable("google_your_follows", {
	id: integer().primaryKey().notNull(),
	followedEntity: text("followed_entity"),
});

export const googleYourLikedContent = pgTable("google_your_liked_content", {
	id: integer().primaryKey().notNull(),
	contentUrl: text("content_url"),
	likedDate: text("liked_date"),
});

export const googleYourPersonalizationFeedback = pgTable("google_your_personalization_feedback", {
	id: integer().primaryKey().notNull(),
	place: text(),
	feedback: text(),
	url: text(),
});

export const appleNotesDetails = pgTable("apple_notes_details", {
	title: text(),
	createdon: text(),
	modifiedon: text(),
	pinned: text(),
	deleted: text(),
	drawingHandwriting: text("drawing_handwriting"),
	contenthashatimport: text(),
});

export const appleNotesLocked = pgTable("apple_notes_locked", {
	name: text(),
	created: text(),
});

export const appleNotesShared = pgTable("apple_notes_shared", {
	filename: text(),
	lastmodifieddate: text(),
	dateshared: text(),
	participantdetails: text(),
});

export const calendarEventCategories = pgTable("calendar_event_categories", {
	id: integer(),
	name: text(),
	description: text(),
	emoji: text(),
	colorCode: text("color_code"),
	iconName: text("icon_name"),
	displayOrder: integer("display_order"),
	createdAt: text("created_at"),
});

export const spotifyUserdata = pgTable("spotify_userdata", {
	username: text(),
	email: text(),
	country: text(),
	createdfromfacebook: text(),
	facebookuid: text(),
	birthdate: text(),
	gender: text(),
	postalcode: text(),
	mobilenumber: text(),
	mobileoperator: text(),
	mobilebrand: text(),
	creationtime: text(),
});

export const spotifyYourlibrary = pgTable("spotify_yourlibrary", {
	tracks: text(),
	albums: text(),
	shows: text(),
	episodes: text(),
	bannedtracks: text(),
	other: text(),
});

export const tasksFts = pgTable("tasks_fts", {
	title: text(),
	description: text(),
	rawText: text("raw_text"),
});

export const tasksFtsConfig = pgTable("tasks_fts_config", {
	k: text(),
	v: integer(),
});

export const tasksFtsData = pgTable("tasks_fts_data", {
	id: integer(),
	block: text(),
});

export const tasksFtsDocsize = pgTable("tasks_fts_docsize", {
	id: integer(),
	sz: text(),
});

export const tasksFtsIdx = pgTable("tasks_fts_idx", {
	segid: integer(),
	term: text(),
	pgno: integer(),
});

export const transportation = pgTable("transportation", {
	id: integer(),
	tripId: integer("trip_id"),
	date: text(),
	type: text(),
	fromLocation: text("from_location"),
	toLocation: text("to_location"),
	cost: text(),
	notes: text(),
	transportationTypeId: integer("transportation_type_id"),
});

export const calendarEventTypeMappings = pgTable("calendar_event_type_mappings", {
	id: integer(),
	rawSummary: text("raw_summary"),
	eventTypeId: text("event_type_id"),
	categoryId: integer("category_id"),
	extractedDetail: text("extracted_detail"),
	extractedPerson: text("extracted_person"),
	confidenceScore: doublePrecision("confidence_score"),
	formatClass: text("format_class"),
	notes: text(),
	createdAt: text("created_at"),
});

export const calendarEventTypes = pgTable("calendar_event_types", {
	id: integer(),
	categoryId: integer("category_id"),
	name: text(),
	description: text(),
	emoji: text(),
	isActive: integer("is_active"),
	frequencyScore: integer("frequency_score"),
	formatClass: text("format_class"),
	parsingRule: text("parsing_rule"),
	createdAt: text("created_at"),
});

export const calendarSummaryMap = pgTable("calendar_summary_map", {
	id: integer(),
	eventId: integer("event_id"),
	originalSummary: text("original_summary"),
	newSummary: text("new_summary"),
	typeDetected: text("type_detected"),
	peopleExtracted: text("people_extracted"),
	yamlValid: integer("yaml_valid"),
	migrationTimestamp: text("migration_timestamp"),
});

export const financeTransactions = pgTable("finance_transactions", {
	id: integer(),
	date: text(),
	name: text(),
	amount: doublePrecision(),
	status: text(),
	category: text(),
	parentCategory: text("parent_category"),
	excluded: integer(),
	tags: text(),
	type: text(),
	account: text(),
	accountMask: text("account_mask"),
	note: text(),
	recurring: text(),
	createdAt: text("created_at"),
	updatedAt: text("updated_at"),
});

export const hotels = pgTable("hotels", {
	id: text(),
	tripId: integer("trip_id"),
	hotelName: text("hotel_name"),
	checkInDate: text("check_in_date"),
	checkOutDate: text("check_out_date"),
	city: text(),
	state: text(),
	country: text(),
	price: doublePrecision(),
	status: text(),
	numberOfTravelers: text("number_of_travelers"),
	notes: text(),
	locationId: text("location_id"),
});

export const entityTags = pgTable("entity_tags", {
	entityId: text("entity_id").notNull(),
	tagId: text("tag_id").notNull(),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	primaryKey({ columns: [table.entityId, table.tagId], name: "entity_tags_pkey"}),
]);

export const tripAttendees = pgTable("trip_attendees", {
	tripId: uuid("trip_id").notNull(),
	personId: integer("person_id").notNull(),
	role: text().default('participant'),
}, (table) => [
	primaryKey({ columns: [table.tripId, table.personId], name: "trip_attendees_pkey"}),
]);

export const activityPeople = pgTable("activity_people", {
	activityId: integer("activity_id").notNull(),
	personId: integer("person_id").notNull(),
	role: text().default('participant'),
}, (table) => [
	primaryKey({ columns: [table.activityId, table.personId], name: "activity_people_pkey"}),
]);

export const userLists = pgTable("user_lists", {
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	listId: uuid().notNull(),
	userId: uuid().notNull(),
}, (table) => [
	index("user_lists_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "user_lists_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_lists_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.listId, table.userId], name: "user_lists_pkey"}),
]);

export const listInvite = pgTable("list_invite", {
	accepted: boolean().default(false).notNull(),
	listId: uuid().notNull(),
	invitedUserEmail: text().notNull(),
	invitedUserId: uuid(),
	userId: uuid().notNull(),
	acceptedAt: timestamp({ precision: 3, mode: 'string' }),
	token: text().default(sql`gen_random_uuid()`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("list_invite_email_idx").using("btree", table.invitedUserEmail.asc().nullsLast().op("text_ops")),
	uniqueIndex("list_invite_token_unique").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "list_invite_listId_list_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.invitedUserId],
			foreignColumns: [users.id],
			name: "list_invite_invitedUserId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "list_invite_userId_user_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.listId, table.invitedUserEmail], name: "list_invite_pkey"}),
]);

export const userArtists = pgTable("user_artists", {
	userId: uuid("user_id").notNull(),
	artistId: uuid("artist_id").notNull(),
	isFavorite: boolean("is_favorite").default(false).notNull(),
	rating: integer().default(1),
	lastListenedAt: timestamp("last_listened_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	isNotificationsEnabled: boolean("is_notifications_enabled").default(true).notNull(),
}, (table) => [
	index("artist_id_idx").using("btree", table.artistId.asc().nullsLast().op("uuid_ops")),
	index("user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_artists_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "user_artists_artist_id_artists_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.artistId], name: "user_artist_pk"}),
	pgPolicy("user_artists_user_isolation", { as: "permissive", for: "all", to: ["mcp_server"], using: sql`(user_id = (current_setting('app.current_user_id'::text, true))::uuid)` }),
]);
export const geographyColumns = pgView("geography_columns", {	// TODO: failed to parse database type 'name'
	fTableCatalog: text("f_table_catalog"),
	// TODO: failed to parse database type 'name'
	fTableSchema: text("f_table_schema"),
	// TODO: failed to parse database type 'name'
	fTableName: text("f_table_name"),
	// TODO: failed to parse database type 'name'
	fGeographyColumn: text("f_geography_column"),
	coordDimension: integer("coord_dimension"),
	srid: integer(),
	type: text(),
}).as(sql`SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`);

export const geometryColumns = pgView("geometry_columns", {	fTableCatalog: varchar("f_table_catalog", { length: 256 }),
	// TODO: failed to parse database type 'name'
	fTableSchema: text("f_table_schema"),
	// TODO: failed to parse database type 'name'
	fTableName: text("f_table_name"),
	// TODO: failed to parse database type 'name'
	fGeometryColumn: text("f_geometry_column"),
	coordDimension: integer("coord_dimension"),
	srid: integer(),
	type: varchar({ length: 30 }),
}).as(sql`SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`);