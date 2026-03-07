import { pgTable, index, foreignKey, unique, pgPolicy, text, uuid, timestamp, check, integer, varchar, uniqueIndex, jsonb, boolean, numeric, date, bigint, primaryKey, pgView, interval, vector, geometry } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const userSessions = pgTable("user_sessions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_sessions_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("user_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_sessions_token_key").on(table.token),
	pgPolicy("user_sessions_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const spatialRefSys = pgTable("spatial_ref_sys", {
	srid: integer().primaryKey().notNull(),
	authName: varchar("auth_name", { length: 256 }),
	authSrid: integer("auth_srid"),
	srtext: varchar({ length: 2048 }),
	proj4Text: varchar({ length: 2048 }),
}, (table) => [
	check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
]);

export const userAccounts = pgTable("user_accounts", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: text("account_id").notNull(),
	provider: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_accounts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_accounts_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_accounts_user_id_provider_account_id_key").on(table.accountId, table.provider, table.userId),
	pgPolicy("user_accounts_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	status: text().default('pending'),
	priority: text().default('medium'),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	parentId: uuid("parent_id"),
	listId: uuid("list_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("tasks_open_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.dueDate.asc().nullsLast().op("uuid_ops"), table.priority.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['pending'::text, 'in_progress'::text]))`),
	index("tasks_user_due_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.dueDate.asc().nullsLast().op("uuid_ops")),
	index("tasks_user_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [taskLists.id],
			name: "tasks_list_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tasks_parent_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tasks_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("tasks_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const goals = pgTable("goals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	targetDate: timestamp("target_date", { withTimezone: true, mode: 'string' }),
	status: text().default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("goals_user_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "goals_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("goals_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("users_email_lower_idx").using("btree", sql`lower(email)`),
	unique("users_email_key").on(table.email),
	pgPolicy("users_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (id = app_current_user_id()))`  }),
]);

export const userApiKeys = pgTable("user_api_keys", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id"),
	name: text().notNull(),
	keyHash: text("key_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_api_keys_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_api_keys_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_api_keys_key_hash_key").on(table.keyHash),
	pgPolicy("user_api_keys_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const tags = pgTable("tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerId: uuid("owner_id").notNull(),
	groupId: text("group_id"),
	name: text().notNull(),
	emojiImageUrl: text("emoji_image_url"),
	color: text(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("tags_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("tags_owner_name_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "tags_owner_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("tags_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (owner_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (owner_id = app_current_user_id()))`  }),
]);

export const taggedItems = pgTable("tagged_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tagId: uuid("tag_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: uuid("entity_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("tagged_items_entity_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("tagged_items_tag_id_idx").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "tagged_items_tag_id_fkey"
		}).onDelete("cascade"),
	unique("tagged_items_tag_id_entity_type_entity_id_key").on(table.entityId, table.entityType, table.tagId),
	pgPolicy("tagged_items_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM tags t
  WHERE ((t.id = tagged_items.tag_id) AND (t.owner_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM tags t
  WHERE ((t.id = tagged_items.tag_id) AND (t.owner_id = app_current_user_id())))))`  }),
]);

export const tagShares = pgTable("tag_shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tagId: uuid("tag_id").notNull(),
	sharedWithUserId: uuid("shared_with_user_id").notNull(),
	permission: text().default('read'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("tag_shares_tag_id_idx").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	index("tag_shares_user_id_idx").using("btree", table.sharedWithUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sharedWithUserId],
			foreignColumns: [users.id],
			name: "tag_shares_shared_with_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "tag_shares_tag_id_fkey"
		}).onDelete("cascade"),
	unique("tag_shares_tag_id_shared_with_user_id_key").on(table.sharedWithUserId, table.tagId),
	pgPolicy("tag_shares_select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`(app_is_service_role() OR (shared_with_user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM tags t
  WHERE ((t.id = tag_shares.tag_id) AND (t.owner_id = app_current_user_id())))))` }),
	pgPolicy("tag_shares_owner_write_policy", { as: "permissive", for: "all", to: ["public"] }),
]);

export const persons = pgTable("persons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerUserId: uuid("owner_user_id").notNull(),
	personType: text("person_type").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	phone: text(),
	avatarUrl: text("avatar_url"),
	notes: text(),
	metadata: jsonb().default({}),
	dateStarted: timestamp("date_started", { withTimezone: true, mode: 'string' }),
	dateEnded: timestamp("date_ended", { withTimezone: true, mode: 'string' }),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector").generatedAlwaysAs(sql`to_tsvector('simple'::regconfig, ((((((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(phone, ''::text)))`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("persons_email_idx").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops"), table.email.asc().nullsLast().op("text_ops")),
	index("persons_name_trgm_idx").using("gin", sql`(((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(las`),
	index("persons_owner_idx").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops"), table.personType.asc().nullsLast().op("uuid_ops")),
	index("persons_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [users.id],
			name: "persons_owner_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("persons_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (owner_user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (owner_user_id = app_current_user_id()))`  }),
]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name"),
	email: text(),
	phone: text(),
	linkedinUrl: text("linkedin_url"),
	title: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("contact_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("contact_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contacts_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("contacts_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const userPersonRelations = pgTable("user_person_relations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	personId: uuid("person_id").notNull(),
	relationshipType: text("relationship_type"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_person_relations_person_idx").using("btree", table.personId.asc().nullsLast().op("uuid_ops")),
	index("user_person_relations_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [persons.id],
			name: "user_person_relations_person_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_person_relations_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_person_relations_user_id_person_id_key").on(table.personId, table.userId),
	pgPolicy("user_person_relations_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const musicTracks = pgTable("music_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	artistName: text("artist_name"),
	albumName: text("album_name"),
	albumArtUrl: text("album_art_url"),
	durationSeconds: integer("duration_seconds"),
	trackNumber: integer("track_number"),
	discNumber: integer("disc_number"),
	isrc: text(),
	genre: text(),
	data: jsonb().default({}),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector").generatedAlwaysAs(sql`to_tsvector('simple'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(artist_name, ''::text)) || ' '::text) || COALESCE(album_name, ''::text)))`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_tracks_external_idx").using("btree", table.source.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	index("music_tracks_isrc_idx").using("btree", table.isrc.asc().nullsLast().op("text_ops")).where(sql`(isrc IS NOT NULL)`),
	index("music_tracks_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	index("music_tracks_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.source.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "music_tracks_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("music_tracks_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const musicAlbums = pgTable("music_albums", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	artistName: text("artist_name"),
	releaseDate: text("release_date"),
	albumArtUrl: text("album_art_url"),
	genre: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_albums_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.source.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "music_albums_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("music_albums_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const musicArtists = pgTable("music_artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	name: text().notNull(),
	imageUrl: text("image_url"),
	genre: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_artists_external_idx").using("btree", table.source.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	index("music_artists_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("music_artists_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.source.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "music_artists_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("music_artists_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const musicPlaylists = pgTable("music_playlists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	name: text().notNull(),
	description: text(),
	imageUrl: text("image_url"),
	isPublic: boolean("is_public").default(false),
	trackCount: integer("track_count").default(0),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_playlists_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.source.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "music_playlists_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("music_playlists_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const musicPlaylistTracks = pgTable("music_playlist_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playlistId: uuid("playlist_id").notNull(),
	trackId: uuid("track_id").notNull(),
	position: integer().notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_playlist_tracks_playlist_idx").using("btree", table.playlistId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("int4_ops")),
	index("music_playlist_tracks_track_idx").using("btree", table.trackId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playlistId],
			foreignColumns: [musicPlaylists.id],
			name: "music_playlist_tracks_playlist_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [musicTracks.id],
			name: "music_playlist_tracks_track_id_fkey"
		}).onDelete("cascade"),
	unique("music_playlist_tracks_playlist_id_track_id_key").on(table.playlistId, table.trackId),
	pgPolicy("music_playlist_tracks_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM music_playlists p
  WHERE ((p.id = music_playlist_tracks.playlist_id) AND (p.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM music_playlists p
  WHERE ((p.id = music_playlist_tracks.playlist_id) AND (p.user_id = app_current_user_id())))))`  }),
]);

export const musicLiked = pgTable("music_liked", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id").notNull(),
	source: text().notNull(),
	likedAt: timestamp("liked_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_liked_user_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.likedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [musicTracks.id],
			name: "music_liked_track_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "music_liked_user_id_fkey"
		}).onDelete("cascade"),
	unique("music_liked_user_id_track_id_key").on(table.trackId, table.userId),
	pgPolicy("music_liked_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const videoChannels = pgTable("video_channels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	name: text().notNull(),
	handle: text(),
	avatarUrl: text("avatar_url"),
	subscriberCount: integer("subscriber_count"),
	description: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_channels_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.source.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "video_channels_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("video_channels_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const videoSubscriptions = pgTable("video_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	channelId: uuid("channel_id").notNull(),
	subscribedAt: timestamp("subscribed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [videoChannels.id],
			name: "video_subscriptions_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "video_subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	unique("video_subscriptions_user_id_channel_id_key").on(table.channelId, table.userId),
	pgPolicy("video_subscriptions_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const calendarEvents = pgTable("calendar_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	eventType: text("event_type").notNull(),
	title: text().notNull(),
	description: text(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	allDay: boolean("all_day").default(false),
	location: text(),
	locationCoords: jsonb("location_coords"),
	source: text(),
	externalId: text("external_id"),
	color: text(),
	recurring: jsonb(),
	metadata: jsonb().default({}),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector").generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(location, ''::text)))`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("calendar_events_agenda_idx").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.startTime.asc().nullsLast().op("timestamptz_ops"), table.endTime.asc().nullsLast().op("uuid_ops"), table.allDay.asc().nullsLast().op("uuid_ops"), table.title.asc().nullsLast().op("timestamptz_ops"), table.color.asc().nullsLast().op("uuid_ops")),
	index("calendar_events_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	index("calendar_events_user_time_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.startTime.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "calendar_events_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("calendar_events_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const calendarAttendees = pgTable("calendar_attendees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	personId: uuid("person_id"),
	email: text(),
	status: text().default('needs_action'),
	role: text().default('required'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("calendar_attendees_event_idx").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")),
	index("calendar_attendees_person_idx").using("btree", table.personId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [calendarEvents.id],
			name: "calendar_attendees_event_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [persons.id],
			name: "calendar_attendees_person_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("calendar_attendees_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM calendar_events e
  WHERE ((e.id = calendar_attendees.event_id) AND (e.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM calendar_events e
  WHERE ((e.id = calendar_attendees.event_id) AND (e.user_id = app_current_user_id())))))`  }),
]);

export const taskLists = pgTable("task_lists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	color: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("task_lists_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_lists_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("task_lists_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const taskListCollaborators = pgTable("task_list_collaborators", {
	listId: uuid("list_id").notNull(),
	userId: uuid("user_id").notNull(),
	addedByUserId: uuid("added_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	primaryKey({ columns: [table.listId, table.userId], name: "task_list_collaborators_pkey"}),
	index("task_list_collaborators_list_idx").using("btree", table.listId.asc().nullsLast().op("uuid_ops")),
	index("task_list_collaborators_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.addedByUserId],
			foreignColumns: [users.id],
			name: "task_list_collaborators_added_by_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [taskLists.id],
			name: "task_list_collaborators_list_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_list_collaborators_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("task_list_collaborators_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM task_lists tl
  WHERE ((tl.id = task_list_collaborators.list_id) AND (tl.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM task_lists tl
  WHERE ((tl.id = task_list_collaborators.list_id) AND (tl.user_id = app_current_user_id())))))`  }),
]);

export const taskListInvites = pgTable("task_list_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	listId: uuid("list_id").notNull(),
	userId: uuid("user_id").notNull(),
	invitedUserEmail: text("invited_user_email").notNull(),
	invitedUserId: uuid("invited_user_id"),
	accepted: boolean().default(false).notNull(),
	token: text().notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("task_list_invites_invited_user_idx").using("btree", table.invitedUserId.asc().nullsLast().op("uuid_ops")),
	index("task_list_invites_list_idx").using("btree", table.listId.asc().nullsLast().op("uuid_ops")),
	index("task_list_invites_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("task_list_invites_email_lower_idx").using("btree", sql`lower(invited_user_email)`),
	foreignKey({
			columns: [table.invitedUserId],
			foreignColumns: [users.id],
			name: "task_list_invites_invited_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.listId],
			foreignColumns: [taskLists.id],
			name: "task_list_invites_list_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_list_invites_user_id_fkey"
		}).onDelete("cascade"),
	unique("task_list_invites_token_key").on(table.token),
	pgPolicy("task_list_invites_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()) OR (invited_user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM task_lists tl
  WHERE ((tl.id = task_list_invites.list_id) AND (tl.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM task_lists tl
  WHERE ((tl.id = task_list_invites.list_id) AND (tl.user_id = app_current_user_id())))))`  }),
]);

export const keyResults = pgTable("key_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	goalId: uuid("goal_id").notNull(),
	title: text().notNull(),
	targetValue: numeric("target_value", { precision: 10, scale:  2 }),
	currentValue: numeric("current_value", { precision: 10, scale:  2 }),
	unit: text(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("key_results_goal_idx").using("btree", table.goalId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.goalId],
			foreignColumns: [goals.id],
			name: "key_results_goal_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("key_results_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM goals g
  WHERE ((g.id = key_results.goal_id) AND (g.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM goals g
  WHERE ((g.id = key_results.goal_id) AND (g.user_id = app_current_user_id())))))`  }),
]);

export const financeAccounts = pgTable("finance_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	accountType: text("account_type").notNull(),
	institutionName: text("institution_name"),
	institutionId: text("institution_id"),
	balance: numeric({ precision: 12, scale:  2 }).default('0'),
	currency: text().default('USD'),
	isActive: boolean("is_active").default(true),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_accounts_active_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.accountType.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	index("finance_accounts_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "finance_accounts_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("finance_accounts_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const places = pgTable("places", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	address: text(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	// TODO: failed to parse database type 'geography'
	location: geometry("location"),
	placeType: text("place_type"),
	rating: numeric({ precision: 2, scale:  1 }),
	notes: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("places_location_idx").using("gist", table.location.asc().nullsLast().op("gist_geography_ops")),
	index("places_type_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.placeType.asc().nullsLast().op("text_ops")),
	index("places_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "places_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("places_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const travelTrips = pgTable("travel_trips", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	status: text().default('planned'),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("travel_trips_user_idx").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.startDate.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "travel_trips_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("travel_trips_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const travelFlights = pgTable("travel_flights", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tripId: uuid("trip_id"),
	flightNumber: text("flight_number"),
	airline: text(),
	departureAirport: text("departure_airport"),
	arrivalAirport: text("arrival_airport"),
	departureTime: timestamp("departure_time", { withTimezone: true, mode: 'string' }),
	arrivalTime: timestamp("arrival_time", { withTimezone: true, mode: 'string' }),
	confirmationCode: text("confirmation_code"),
	seat: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("travel_flights_trip_idx").using("btree", table.tripId.asc().nullsLast().op("uuid_ops")),
	index("travel_flights_user_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.departureTime.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.tripId],
			foreignColumns: [travelTrips.id],
			name: "travel_flights_trip_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "travel_flights_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("travel_flights_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const travelHotels = pgTable("travel_hotels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tripId: uuid("trip_id"),
	name: text().notNull(),
	address: text(),
	checkIn: date("check_in"),
	checkOut: date("check_out"),
	confirmationCode: text("confirmation_code"),
	roomType: text("room_type"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("travel_hotels_trip_idx").using("btree", table.tripId.asc().nullsLast().op("uuid_ops")),
	index("travel_hotels_user_idx").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.checkIn.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.tripId],
			foreignColumns: [travelTrips.id],
			name: "travel_hotels_trip_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "travel_hotels_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("travel_hotels_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const careerCompanies = pgTable("career_companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	industry: text(),
	size: text(),
	website: text(),
	logoUrl: text("logo_url"),
	notes: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("career_companies_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("career_companies_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "career_companies_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("career_companies_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const careerJobs = pgTable("career_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	companyId: uuid("company_id"),
	title: text().notNull(),
	location: text(),
	remoteType: text("remote_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	salaryMin: bigint("salary_min", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	salaryMax: bigint("salary_max", { mode: "number" }),
	salaryCurrency: text("salary_currency").default('USD'),
	url: text(),
	status: text().default('interested'),
	notes: text(),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("career_jobs_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [careerCompanies.id],
			name: "career_jobs_company_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "career_jobs_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("career_jobs_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const careerApplications = pgTable("career_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	jobId: uuid("job_id").notNull(),
	appliedAt: date("applied_at"),
	status: text().default('applied'),
	stage: text(),
	outcome: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("career_applications_job_idx").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("career_applications_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.stage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [careerJobs.id],
			name: "career_applications_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "career_applications_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("career_applications_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const careerInterviews = pgTable("career_interviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id").notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	format: text(),
	type: text(),
	interviewers: jsonb().default([]),
	feedback: text(),
	outcome: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("career_interviews_application_idx").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [careerApplications.id],
			name: "career_interviews_application_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("career_interviews_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM career_applications a
  WHERE ((a.id = career_interviews.application_id) AND (a.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM career_applications a
  WHERE ((a.id = career_interviews.application_id) AND (a.user_id = app_current_user_id())))))`  }),
]);

export const schools = pgTable("schools", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	degree: text(),
	fieldOfStudy: text("field_of_study"),
	startYear: integer("start_year"),
	endYear: integer("end_year"),
	gpa: numeric({ precision: 3, scale:  2 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("schools_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "schools_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("schools_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const notes = pgTable("notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().default('note').notNull(),
	status: text().default('draft').notNull(),
	title: text(),
	content: text(),
	excerpt: text(),
	mentions: jsonb().default([]),
	analysis: jsonb(),
	publishingMetadata: jsonb("publishing_metadata"),
	parentNoteId: uuid("parent_note_id"),
	versionNumber: integer("version_number").default(1).notNull(),
	isLatestVersion: boolean("is_latest_version").default(true).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	source: text(),
	isLocked: boolean("is_locked").default(false),
	folder: text(),
	data: jsonb().default({}),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector").generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(content, ''::text)))`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("notes_latest_idx").using("btree", table.isLatestVersion.asc().nullsLast().op("bool_ops")),
	index("notes_parent_idx").using("btree", table.parentNoteId.asc().nullsLast().op("uuid_ops")),
	index("notes_published_at_idx").using("btree", table.publishedAt.asc().nullsLast().op("timestamptz_ops")),
	index("notes_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	index("notes_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("notes_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("notes_user_unlocked_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.updatedAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(is_locked = false)`),
	index("notes_user_updated_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("notes_version_idx").using("btree", table.parentNoteId.asc().nullsLast().op("uuid_ops"), table.versionNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.parentNoteId],
			foreignColumns: [table.id],
			name: "notes_parent_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notes_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("notes_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const noteTags = pgTable("note_tags", {
	noteId: uuid("note_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	primaryKey({ columns: [table.noteId, table.tagId], name: "note_tags_pkey"}),
	index("note_tags_note_idx").using("btree", table.noteId.asc().nullsLast().op("uuid_ops")),
	index("note_tags_tag_idx").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [notes.id],
			name: "note_tags_note_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "note_tags_tag_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("note_tags_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = app_current_user_id())))))`, withCheck: sql`(app_is_service_role() OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = app_current_user_id())))))`  }),
]);

export const noteShares = pgTable("note_shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	noteId: uuid("note_id").notNull(),
	sharedWithUserId: uuid("shared_with_user_id").notNull(),
	permission: text().default('read'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("note_shares_note_idx").using("btree", table.noteId.asc().nullsLast().op("uuid_ops")),
	index("note_shares_user_idx").using("btree", table.sharedWithUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [notes.id],
			name: "note_shares_note_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedWithUserId],
			foreignColumns: [users.id],
			name: "note_shares_shared_with_user_id_fkey"
		}).onDelete("cascade"),
	unique("note_shares_note_id_shared_with_user_id_key").on(table.noteId, table.sharedWithUserId),
	pgPolicy("note_shares_select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`(app_is_service_role() OR (shared_with_user_id = app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_shares.note_id) AND (n.user_id = app_current_user_id())))))` }),
	pgPolicy("note_shares_owner_write_policy", { as: "permissive", for: "all", to: ["public"] }),
]);

export const bookmarks = pgTable("bookmarks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	url: text().notNull(),
	title: text(),
	description: text(),
	favicon: text(),
	thumbnail: text(),
	source: text(),
	folder: text(),
	data: jsonb().default({}),
	// TODO: failed to parse database type 'tsvector'
	searchVector: text("search_vector").generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(url, ''::text)))`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("bookmarks_folder_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.folder.asc().nullsLast().op("text_ops")).where(sql`(folder IS NOT NULL)`),
	index("bookmarks_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	index("bookmarks_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bookmarks_user_id_fkey"
		}).onDelete("cascade"),
	unique("bookmarks_user_id_url_key").on(table.url, table.userId),
	pgPolicy("bookmarks_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const possessionContainers = pgTable("possession_containers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	location: text(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("possession_containers_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "possession_containers_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("possession_containers_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const possessions = pgTable("possessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	containerId: uuid("container_id"),
	name: text().notNull(),
	description: text(),
	category: text(),
	purchaseDate: date("purchase_date"),
	purchasePrice: numeric("purchase_price", { precision: 10, scale:  2 }),
	currentValue: numeric("current_value", { precision: 10, scale:  2 }),
	condition: text(),
	location: text(),
	serialNumber: text("serial_number"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("possessions_category_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.category.asc().nullsLast().op("text_ops")),
	index("possessions_container_idx").using("btree", table.containerId.asc().nullsLast().op("uuid_ops")),
	index("possessions_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.containerId],
			foreignColumns: [possessionContainers.id],
			name: "possessions_container_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "possessions_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("possessions_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const possessionsUsage = pgTable("possessions_usage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	possessionId: uuid("possession_id").notNull(),
	containerId: uuid("container_id"),
	type: text(),
	timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' }),
	amount: numeric("amount", { precision: 10, scale: 2 }),
	amountUnit: text("amount_unit"),
	method: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("possessions_usage_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("possessions_usage_possession_idx").using("btree", table.possessionId.asc().nullsLast().op("uuid_ops")),
	index("possessions_usage_container_idx").using("btree", table.containerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "possessions_usage_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.possessionId],
		foreignColumns: [possessions.id],
		name: "possessions_usage_possession_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.containerId],
		foreignColumns: [possessionContainers.id],
		name: "possessions_usage_container_id_fkey"
	}).onDelete("set null"),
	pgPolicy("possessions_usage_tenant_policy", { as: "permissive", for: "all", to: ["public"], using: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`, withCheck: sql`(app_is_service_role() OR (user_id = app_current_user_id()))`  }),
]);

export const searches2025Q1 = pgTable("searches_2025_q1", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_2025_q1_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_2025_q1_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_2025_q1_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_2025_q1_pkey"}),
]);

export const searches2025Q2 = pgTable("searches_2025_q2", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_2025_q2_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_2025_q2_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_2025_q2_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_2025_q2_pkey"}),
]);

export const searches2025Q3 = pgTable("searches_2025_q3", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_2025_q3_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_2025_q3_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_2025_q3_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_2025_q3_pkey"}),
]);

export const searches2025Q4 = pgTable("searches_2025_q4", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_2025_q4_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_2025_q4_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_2025_q4_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_2025_q4_pkey"}),
]);

export const searches2026Q1 = pgTable("searches_2026_q1", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_2026_q1_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_2026_q1_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_2026_q1_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_2026_q1_pkey"}),
]);

export const searchesDefault = pgTable("searches_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	resultsCount: integer("results_count"),
	clickedResultId: uuid("clicked_result_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("searches_default_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("searches_default_query_idx").using("gin", table.query.asc().nullsLast().op("gin_trgm_ops")),
	index("searches_default_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "searches_default_pkey"}),
]);

export const logs202501 = pgTable("logs_2025_01", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_01_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_01_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_01_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_01_pkey"}),
]);

export const logs202502 = pgTable("logs_2025_02", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_02_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_02_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_02_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_02_pkey"}),
]);

export const logs202503 = pgTable("logs_2025_03", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_03_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_03_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_03_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_03_pkey"}),
]);

export const logs202504 = pgTable("logs_2025_04", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_04_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_04_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_04_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_04_pkey"}),
]);

export const logs202505 = pgTable("logs_2025_05", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_05_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_05_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_05_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_05_pkey"}),
]);

export const logs202506 = pgTable("logs_2025_06", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_06_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_06_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_06_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_06_pkey"}),
]);

export const logs202507 = pgTable("logs_2025_07", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_07_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_07_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_07_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_07_pkey"}),
]);

export const logs202508 = pgTable("logs_2025_08", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_08_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_08_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_08_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_08_pkey"}),
]);

export const logs202509 = pgTable("logs_2025_09", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_09_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_09_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_09_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_09_pkey"}),
]);

export const logs202510 = pgTable("logs_2025_10", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_10_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_10_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_10_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_10_pkey"}),
]);

export const logs202511 = pgTable("logs_2025_11", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_11_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_11_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_11_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_11_pkey"}),
]);

export const logs202512 = pgTable("logs_2025_12", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2025_12_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2025_12_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2025_12_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2025_12_pkey"}),
]);

export const logs202601 = pgTable("logs_2026_01", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2026_01_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2026_01_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2026_01_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2026_01_pkey"}),
]);

export const logs202602 = pgTable("logs_2026_02", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2026_02_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2026_02_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2026_02_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2026_02_pkey"}),
]);

export const logs202603 = pgTable("logs_2026_03", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_2026_03_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_2026_03_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_2026_03_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_2026_03_pkey"}),
]);

export const logsDefault = pgTable("logs_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("logs_default_created_at_idx").using("brin", table.createdAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("logs_default_entity_type_entity_id_created_at_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")).where(sql`(entity_type IS NOT NULL)`),
	index("logs_default_user_id_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.createdAt, table.id], name: "logs_default_pkey"}),
]);

export const healthRecords2023 = pgTable("health_records_2023", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	recordType: text("record_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }),
	unit: text(),
	source: text(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("health_records_2023_recorded_at_idx").using("brin", table.recordedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("health_records_2023_user_id_record_type_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.recordType.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("text_ops")),
	index("health_records_2023_user_id_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.id, table.recordedAt], name: "health_records_2023_pkey"}),
]);

export const healthRecords2024 = pgTable("health_records_2024", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	recordType: text("record_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }),
	unit: text(),
	source: text(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("health_records_2024_recorded_at_idx").using("brin", table.recordedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("health_records_2024_user_id_record_type_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.recordType.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("text_ops")),
	index("health_records_2024_user_id_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.id, table.recordedAt], name: "health_records_2024_pkey"}),
]);

export const healthRecords2025 = pgTable("health_records_2025", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	recordType: text("record_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }),
	unit: text(),
	source: text(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("health_records_2025_recorded_at_idx").using("brin", table.recordedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("health_records_2025_user_id_record_type_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.recordType.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("text_ops")),
	index("health_records_2025_user_id_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.id, table.recordedAt], name: "health_records_2025_pkey"}),
]);

export const healthRecords2026 = pgTable("health_records_2026", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	recordType: text("record_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }),
	unit: text(),
	source: text(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("health_records_2026_recorded_at_idx").using("brin", table.recordedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("health_records_2026_user_id_record_type_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.recordType.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("text_ops")),
	index("health_records_2026_user_id_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.id, table.recordedAt], name: "health_records_2026_pkey"}),
]);

export const healthRecordsDefault = pgTable("health_records_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	recordType: text("record_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }),
	unit: text(),
	source: text(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("health_records_default_recorded_at_idx").using("brin", table.recordedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("health_records_default_user_id_record_type_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.recordType.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("text_ops")),
	index("health_records_default_user_id_recorded_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	primaryKey({ columns: [table.id, table.recordedAt], name: "health_records_default_pkey"}),
]);

export const musicListening2023 = pgTable("music_listening_2023", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	source: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	completed: boolean().default(false),
	contextType: text("context_type"),
	contextId: text("context_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_listening_2023_started_at_idx").using("brin", table.startedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("music_listening_2023_user_id_started_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	primaryKey({ columns: [table.id, table.startedAt], name: "music_listening_2023_pkey"}),
]);

export const musicListening2024 = pgTable("music_listening_2024", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	source: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	completed: boolean().default(false),
	contextType: text("context_type"),
	contextId: text("context_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_listening_2024_started_at_idx").using("brin", table.startedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("music_listening_2024_user_id_started_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	primaryKey({ columns: [table.id, table.startedAt], name: "music_listening_2024_pkey"}),
]);

export const musicListening2025 = pgTable("music_listening_2025", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	source: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	completed: boolean().default(false),
	contextType: text("context_type"),
	contextId: text("context_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_listening_2025_started_at_idx").using("brin", table.startedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("music_listening_2025_user_id_started_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	primaryKey({ columns: [table.id, table.startedAt], name: "music_listening_2025_pkey"}),
]);

export const musicListening2026 = pgTable("music_listening_2026", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	source: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	completed: boolean().default(false),
	contextType: text("context_type"),
	contextId: text("context_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_listening_2026_started_at_idx").using("brin", table.startedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("music_listening_2026_user_id_started_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	primaryKey({ columns: [table.id, table.startedAt], name: "music_listening_2026_pkey"}),
]);

export const musicListeningDefault = pgTable("music_listening_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	source: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationSeconds: integer("duration_seconds"),
	completed: boolean().default(false),
	contextType: text("context_type"),
	contextId: text("context_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("music_listening_default_started_at_idx").using("brin", table.startedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	index("music_listening_default_user_id_started_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	primaryKey({ columns: [table.id, table.startedAt], name: "music_listening_default_pkey"}),
]);

export const financeTransactions2024 = pgTable("finance_transactions_2024", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_2024_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_2024_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_2024_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_2024_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_2024_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_2024_pkey"}),
]);

export const financeTransactions2022 = pgTable("finance_transactions_2022", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_2022_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_2022_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_2022_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_2022_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_2022_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_2022_pkey"}),
]);

export const financeTransactions2023 = pgTable("finance_transactions_2023", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_2023_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_2023_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_2023_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_2023_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_2023_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_2023_pkey"}),
]);

export const financeTransactions2025 = pgTable("finance_transactions_2025", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_2025_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_2025_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_2025_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_2025_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_2025_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_2025_pkey"}),
]);

export const financeTransactions2026 = pgTable("finance_transactions_2026", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_2026_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_2026_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_2026_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_2026_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_2026_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_2026_pkey"}),
]);

export const financeTransactionsDefault = pgTable("finance_transactions_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	categoryId: uuid("category_id"),
	category: text(),
	description: text(),
	merchantName: text("merchant_name"),
	date: date().notNull(),
	dateRaw: text("date_raw"),
	pending: boolean().default(false),
	source: text(),
	externalId: text("external_id"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("finance_transactions_default_account_id_date_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("uuid_ops")),
	index("finance_transactions_default_date_idx").using("brin", table.date.asc().nullsLast().op("date_minmax_ops")).with({pages_per_range: "32"}),
	index("finance_transactions_default_user_id_category_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")).where(sql`(category_id IS NOT NULL)`),
	index("finance_transactions_default_user_id_date_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.date.desc().nullsFirst().op("date_ops")),
	index("finance_transactions_default_user_id_date_idx1").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.desc().nullsFirst().op("uuid_ops")).where(sql`(pending = true)`),
	primaryKey({ columns: [table.date, table.id], name: "finance_transactions_default_pkey"}),
]);

export const videoViewings2023 = pgTable("video_viewings_2023", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	contentType: text("content_type").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	durationSeconds: integer("duration_seconds"),
	watchedAt: timestamp("watched_at", { withTimezone: true, mode: 'string' }).notNull(),
	watchTimeSeconds: integer("watch_time_seconds").default(0),
	completed: boolean().default(false),
	season: integer(),
	episode: integer(),
	channelName: text("channel_name"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_viewings_2023_user_id_content_type_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.contentType.asc().nullsLast().op("uuid_ops")),
	index("video_viewings_2023_user_id_watched_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.watchedAt.desc().nullsFirst().op("uuid_ops")),
	index("video_viewings_2023_watched_at_idx").using("brin", table.watchedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	primaryKey({ columns: [table.id, table.watchedAt], name: "video_viewings_2023_pkey"}),
]);

export const videoViewings2024 = pgTable("video_viewings_2024", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	contentType: text("content_type").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	durationSeconds: integer("duration_seconds"),
	watchedAt: timestamp("watched_at", { withTimezone: true, mode: 'string' }).notNull(),
	watchTimeSeconds: integer("watch_time_seconds").default(0),
	completed: boolean().default(false),
	season: integer(),
	episode: integer(),
	channelName: text("channel_name"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_viewings_2024_user_id_content_type_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.contentType.asc().nullsLast().op("uuid_ops")),
	index("video_viewings_2024_user_id_watched_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.watchedAt.desc().nullsFirst().op("uuid_ops")),
	index("video_viewings_2024_watched_at_idx").using("brin", table.watchedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	primaryKey({ columns: [table.id, table.watchedAt], name: "video_viewings_2024_pkey"}),
]);

export const videoViewings2025 = pgTable("video_viewings_2025", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	contentType: text("content_type").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	durationSeconds: integer("duration_seconds"),
	watchedAt: timestamp("watched_at", { withTimezone: true, mode: 'string' }).notNull(),
	watchTimeSeconds: integer("watch_time_seconds").default(0),
	completed: boolean().default(false),
	season: integer(),
	episode: integer(),
	channelName: text("channel_name"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_viewings_2025_user_id_content_type_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.contentType.asc().nullsLast().op("uuid_ops")),
	index("video_viewings_2025_user_id_watched_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.watchedAt.desc().nullsFirst().op("uuid_ops")),
	index("video_viewings_2025_watched_at_idx").using("brin", table.watchedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	primaryKey({ columns: [table.id, table.watchedAt], name: "video_viewings_2025_pkey"}),
]);

export const videoViewings2026 = pgTable("video_viewings_2026", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	contentType: text("content_type").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	durationSeconds: integer("duration_seconds"),
	watchedAt: timestamp("watched_at", { withTimezone: true, mode: 'string' }).notNull(),
	watchTimeSeconds: integer("watch_time_seconds").default(0),
	completed: boolean().default(false),
	season: integer(),
	episode: integer(),
	channelName: text("channel_name"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_viewings_2026_user_id_content_type_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.contentType.asc().nullsLast().op("uuid_ops")),
	index("video_viewings_2026_user_id_watched_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.watchedAt.desc().nullsFirst().op("uuid_ops")),
	index("video_viewings_2026_watched_at_idx").using("brin", table.watchedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	primaryKey({ columns: [table.id, table.watchedAt], name: "video_viewings_2026_pkey"}),
]);

export const videoViewingsDefault = pgTable("video_viewings_default", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	contentType: text("content_type").notNull(),
	externalId: text("external_id"),
	source: text().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	durationSeconds: integer("duration_seconds"),
	watchedAt: timestamp("watched_at", { withTimezone: true, mode: 'string' }).notNull(),
	watchTimeSeconds: integer("watch_time_seconds").default(0),
	completed: boolean().default(false),
	season: integer(),
	episode: integer(),
	channelName: text("channel_name"),
	data: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("video_viewings_default_user_id_content_type_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.contentType.asc().nullsLast().op("uuid_ops")),
	index("video_viewings_default_user_id_watched_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.watchedAt.desc().nullsFirst().op("uuid_ops")),
	index("video_viewings_default_watched_at_idx").using("brin", table.watchedAt.asc().nullsLast().op("timestamptz_minmax_ops")).with({pages_per_range: "128"}),
	primaryKey({ columns: [table.id, table.watchedAt], name: "video_viewings_default_pkey"}),
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
}).as(sql`SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, (regexp_match(s.consrc, 'geometrytype\(\w+\)\s*=\s*''(\w+)'''::text, 'i'::text))[1] AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~* 'geometrytype\(\w+\)\s*=\s*''\w+'''::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, (regexp_match(s.consrc, 'ndims\(\w+\)\s*=\s*(\d+)'::text, 'i'::text))[1]::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~* 'ndims\(\w+\)\s*=\s*\d+'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, (regexp_match(s.consrc, 'srid\(\w+\)\s*=\s*(\d+)'::text, 'i'::text))[1]::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~* 'srid\(\w+\)\s*=\s*\d+'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`);

export const authSessions = pgTable("auth_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionState: text("session_state").notNull(),
	acr: text(),
	amr: jsonb().$type<string[]>().default([]),
	ipHash: text("ip_hash"),
	userAgentHash: text("user_agent_hash"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("auth_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "auth_sessions_user_id_fkey",
	}).onDelete("cascade"),
]);

export const authRefreshTokens = pgTable("auth_refresh_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	familyId: uuid("family_id").notNull(),
	parentId: uuid("parent_id"),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("auth_refresh_tokens_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	index("auth_refresh_tokens_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.sessionId],
		foreignColumns: [authSessions.id],
		name: "auth_refresh_tokens_session_id_fkey",
	}).onDelete("cascade"),
]);

export const authSubjectsTable = pgTable("auth_subjects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	providerSubject: text("provider_subject").notNull(),
	isPrimary: boolean("is_primary").default(false),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	unlinkedAt: timestamp("unlinked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("auth_subjects_provider_provider_subject_key").on(table.provider, table.providerSubject),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "auth_subjects_user_id_fkey",
	}).onDelete("cascade"),
]);

export const partitionAudit = pgView("partition_audit", {	parentTable: text("parent_table"),
	requiredUntil: timestamp("required_until", { withTimezone: true, mode: 'string' }),
	maxPartitionTo: timestamp("max_partition_to", { withTimezone: true, mode: 'string' }),
	hasCoverage: boolean("has_coverage"),
	gapInterval: interval("gap_interval"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	defaultPartitionSpillRowCount: bigint("default_partition_spill_row_count", { mode: "number" }),
	oldestPartitionFrom: timestamp("oldest_partition_from", { withTimezone: true, mode: 'string' }),
	retentionCutoff: timestamp("retention_cutoff", { withTimezone: true, mode: 'string' }),
	retentionViolation: boolean("retention_violation"),
}).as(sql`WITH coverage AS ( SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('music_listening'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) UNION ALL SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('video_viewings'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) UNION ALL SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('health_records'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) UNION ALL SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('finance_transactions'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) UNION ALL SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('logs'::regclass, '6 mons'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) UNION ALL SELECT partition_future_coverage.parent_table, partition_future_coverage.required_until, partition_future_coverage.max_partition_to, partition_future_coverage.has_coverage, partition_future_coverage.gap_interval FROM partition_future_coverage('searches'::regclass, '9 mons'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval) ), spill AS ( SELECT default_partition_spill_rows.parent_table, default_partition_spill_rows.default_partition, default_partition_spill_rows.spill_row_count FROM default_partition_spill_rows() default_partition_spill_rows(parent_table, default_partition, spill_row_count) ), retention AS ( SELECT 'logs'::text AS parent_table, COALESCE(( SELECT min(partition_bounds.from_value) AS min FROM partition_bounds('logs'::regclass) partition_bounds(parent_table, partition_name, is_default, from_value, to_value) WHERE partition_bounds.is_default = false), NULL::timestamp with time zone) AS oldest_partition_from, date_trunc('month'::text, now()) - '1 year 6 mons'::interval AS retention_cutoff UNION ALL SELECT 'searches'::text AS parent_table, COALESCE(( SELECT min(partition_bounds.from_value) AS min FROM partition_bounds('searches'::regclass) partition_bounds(parent_table, partition_name, is_default, from_value, to_value) WHERE partition_bounds.is_default = false), NULL::timestamp with time zone) AS oldest_partition_from, date_trunc('month'::text, now()) - '1 year 6 mons'::interval AS retention_cutoff ) SELECT c.parent_table, c.required_until, c.max_partition_to, c.has_coverage, c.gap_interval, COALESCE(s.spill_row_count, 0::bigint) AS default_partition_spill_row_count, r.oldest_partition_from, r.retention_cutoff, CASE WHEN r.oldest_partition_from IS NULL THEN false WHEN r.oldest_partition_from < r.retention_cutoff THEN true ELSE false END AS retention_violation FROM coverage c LEFT JOIN spill s ON s.parent_table = c.parent_table LEFT JOIN retention r ON r.parent_table = c.parent_table`);
