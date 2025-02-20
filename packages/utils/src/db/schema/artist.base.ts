import { z } from "zod";

export const ArtistBaseSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	hometown: z.string().optional(),
	country: z.string().optional(),
	bandMembers: z.number().int().min(1).default(1),
	genres: z.array(z.string()),
	averageTicketPrice: z.number(),
	averagePerformanceAttendance: z.number().optional(),
	sellsMerchandise: z.boolean().default(false),
	averageMerchandisePrice: z.number().optional(),
	imageUrl: z.string().optional(),
	websiteUrl: z.string().optional(),
	spotifyFollowers: z.number().default(0),
	spotifyUrl: z.string().optional(),
	spotifyId: z.string(),
	spotifyData: z.record(z.unknown()),
});
