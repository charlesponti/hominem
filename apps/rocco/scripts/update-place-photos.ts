import "dotenv/config";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../app/db";
import { place } from "@hominem/data/db/schema/index";

// Google API key
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
	throw new Error("VITE_GOOGLE_API_KEY environment variable is required");
}

async function updatePlacePhotos() {
	console.log("Starting to update place photos...");

	try {
		// Get all places that have a googleMapsId but no photos
		const placesToUpdate = await db.query.place.findMany({
			where: and(isNotNull(place.googleMapsId), isNull(place.photos)),
		});

		console.log(`Found ${placesToUpdate.length} places to update`);

		let updatedCount = 0;
		let errorCount = 0;

		for (const placeRecord of placesToUpdate) {
			if (!placeRecord.googleMapsId) {
				console.log(`Skipping place ${placeRecord.id} - no googleMapsId`);
				continue;
			}

			try {
				console.log(
					`Fetching photos for place: ${placeRecord.name} (${placeRecord.googleMapsId})`,
				);

				// Fetch place details from Google Places API
				const response = await fetch(
					`https://places.googleapis.com/v1/places/${placeRecord.googleMapsId}`,
					{
						headers: {
							"X-Goog-Api-Key": GOOGLE_API_KEY,
							"X-Goog-FieldMask": "photos",
						} as HeadersInit,
					},
				);

				if (!response.ok) {
					const errorText = await response.text();
					console.error(
						`Failed to fetch place details for ${placeRecord.googleMapsId}: ${response.status} ${response.statusText}`,
					);
					console.error(`Error response: ${errorText}`);
					errorCount++;
					continue;
				}

				const placeData = await response.json();
				console.log(
					`API Response for ${placeRecord.googleMapsId}:`,
					JSON.stringify(placeData, null, 2),
				);
				const photos = placeData.photos;

				if (!photos || photos.length === 0) {
					console.log(`No photos found for place: ${placeRecord.name}`);
					continue;
				}

				// Extract photo references
				const photoUrls = photos.map((photo: any) => photo.name);

				// Update the place with photo references
				await db
					.update(place)
					.set({
						photos: photoUrls,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(place.id, placeRecord.id));

				console.log(
					`✅ Updated place "${placeRecord.name}" with ${photoUrls.length} photos`,
				);
				updatedCount++;

				// Add a small delay to avoid hitting API rate limits
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`Error updating place ${placeRecord.name}:`, error);
				errorCount++;
			}
		}

		console.log("\nUpdate complete!");
		console.log(`✅ Successfully updated: ${updatedCount} places`);
		console.log(`❌ Errors: ${errorCount} places`);
	} catch (error) {
		console.error("Script failed:", error);
	}
}

// Run the script
updatePlacePhotos().catch(console.error);
