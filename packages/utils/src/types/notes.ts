import type { tags } from "../db/schema/tags.schema";

export interface Note {
	id: string;
	content: string;
	title?: string;
	createdAt: Date;
	updatedAt?: Date;
}

export interface NoteTag {
	noteId: string;
	tagId: (typeof tags.$inferSelect)["id"];
}
