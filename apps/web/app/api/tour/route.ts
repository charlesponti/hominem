import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const TourCostBreakdown = z.object({
	transportation: z.object({
		vehicleRental: z.number(),
		fuel: z.number(),
		flights: z.number().optional(),
		equipmentTransport: z.number(),
	}),
	accommodation: z.object({
		hotelCosts: z.number(),
		numberOfNights: z.number(),
		crewAccommodation: z.number(),
	}),
	venues: z.object({
		averageVenueCost: z.number(),
		equipmentRental: z.number(),
		staffing: z.number(),
		insurance: z.number(),
	}),
	routing: z.array(
		z.object({
			city: z.string(),
			dateRange: z.string(),
			distanceFromPrevious: z.number().optional(),
		}),
	),
	totalCost: z.number(),
});

const inputSchema = z.object({
	startingDate: z.string().optional(),
	startCity: z.string().min(1),
	endCity: z.string().min(1),
	genres: z.array(z.string()).optional(),
	numberOfBandMembers: z.number().min(1).default(4),
	numberOfCrewMembers: z.number().min(0).default(2),
	durationInDays: z.number().min(1).max(90).default(14),
});

export const maxDuration = 30;

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const input = inputSchema.parse(body);

		const prompt = `
      Create a detailed tour cost breakdown for a ${input.durationInDays}-day tour from ${input.startCity} to ${input.endCity}.

      Tour Details:
      - Band members: ${input.numberOfBandMembers}
      - Crew members: ${input.numberOfCrewMembers}
      - Start date: ${input.startingDate || new Date().toISOString()}
      ${input.genres ? `- Music genre: ${input.genres.join(", ")}` : ""}

      Requirements:
      1. Plan optimal routing between cities considering:
         - Logical geographical progression
         - Typical venue availability
         - Market size and potential audience
      
      2. Calculate detailed costs for:
         - Transportation (vehicle rental, fuel, equipment transport)
         - Accommodations for band and crew
         - Venue rentals and equipment
         - Staff and insurance
      
      3. Consider:
         - Seasonal price variations
         - Distance between venues
         - Local market rates
         - Equipment requirements
         - Rest days for travel

      Provide a comprehensive breakdown optimized for a ${input.genres?.join("/")} act.
    `;

		const response = await generateObject({
			model: openai("gpt-4"),
			prompt,
			schema: TourCostBreakdown,
			temperature: 0.7,
		});

		return Response.json(response.object);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return Response.json(
				{ error: "Invalid input", details: error.issues },
				{ status: 400 },
			);
		}
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
