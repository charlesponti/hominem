import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { ArtistBaseSchema } from "./artist.base";
import { artists } from "./music.schema";

export const ArtistInsertSchema = ArtistBaseSchema.merge(
	createInsertSchema(artists),
);
export const ArtistSelectSchema = ArtistBaseSchema.merge(
	createSelectSchema(artists),
);

export type ArtistFormData = typeof ArtistInsertSchema;
