// import dotenv from "dotenv";
// dotenv.config();

// import { db as mongodb } from "../lib/data/mongodb";
// import { db as postgres } from "../lib/data/postgres";
// import { type VenueInsert, venues } from "../lib/data/models/venues";
// import { redis } from "../lib/redis";
// import type { IOTMVenue } from "@/lib/iotm/iotm";

// const MIGRATION_KEY = "venue_migration_progress";
// const ERROR_KEY = "venue_migration_errors";

// async function getMigrationProgress() {
//   const progress = (await redis.get(MIGRATION_KEY)) as string | null;
//   return progress ? Number.parseInt(progress, 10) : 0;
// }

// async function setMigrationProgress(index: number) {
//   await redis.set(MIGRATION_KEY, index.toString());
// }

// async function logError(index: number, error: Error) {
//   await redis.hset(ERROR_KEY, {
//     index: index.toString(),
//     error: JSON.stringify(error),
//   });
// }

// async function migrateVenuesToPostgres() {
//   const collection = mongodb.collection("venues");

//   try {
//     const mongoVenues = await collection.find({}).toArray();
//     console.log(`Found ${mongoVenues.length} venues to migrate`);

//     if (mongoVenues.length === 0) {
//       console.log("No venues to migrate");
//       process.exit(0);
//     }

//     const startIndex = await getMigrationProgress();
//     console.log(`Resuming from index ${startIndex}`);

//     // Transform and insert in batches
//     const batchSize = 100;
//     for (let i = startIndex; i < mongoVenues.length; i += batchSize) {
//       try {
//         const batch = mongoVenues.slice(i, i + batchSize);

//         const transformedVenues: VenueInsert[] = batch.map((venue) => ({
//           id: crypto.randomUUID(),
//           blacklist_genres:
//             venue.blacklist_genres?.data?.map(
//               (v: IOTMVenue["blacklist_genres"]["data"][number]) => v.genre
//             ) || [],
//           capacity: venue.capacity || 0,
//           capacity_extra: venue.capacity_extra || "",
//           categories:
//             venue.categories?.data?.map(
//               (v: IOTMVenue["categories"]["data"][number]) => v.name
//             ) || [],
//           contact_phone_number: venue.phone || null,
//           description: venue.description || null,
//           genres:
//             venue.genres?.data?.map(
//               (v: IOTMVenue["genres"]["data"][number]) => v.genre
//             ) || [],
//           image_url: venue.img_url || null,
//           notes: venue.notes || null,
//           rating: venue.rating || 0,
//           song_types: venue.song_types || null,
//           status: venue.status || null,
//           title: venue.title || null,
//           address: venue.address || "",
//           city: venue.city || null,
//           country: venue.country || null,
//           latitude: venue.latitude?.toString() || null,
//           longitude: venue.longitude?.toString() || null,
//           postal_code: venue.postal_code || null,
//           state_code: venue.state_code || null,
//           state: venue.state || null,
//           eventful: venue.eventful || null,
//           facebook: venue.facebook || null,
//           twitter: venue.twitter || null,
//           yelp: venue.yelp || null,
//           website: venue.website || null,
//           iotm_id: venue.id?.toString(),
//         }));

//         await postgres.insert(venues).values(transformedVenues);
//         await setMigrationProgress(i + batchSize);
//         console.log(
//           `Migrated batch ${i / batchSize + 1}: ${batch.length} venues`
//         );
//       } catch (error) {
//         console.error(`Error processing batch starting at index ${i}:`, error);
//         await logError(i, error as Error);
//         // Continue with next batch instead of failing completely
//         // continue;
//       }
//     }

//     // Check for any errors that occurred during migration
//     const errors = await redis.hgetall(ERROR_KEY);
//     if (Object.keys(errors || {}).length > 0) {
//       console.log(
//         "Migration completed with errors. Check Redis key:",
//         ERROR_KEY
//       );
//     } else {
//       console.log("Migration completed successfully");
//       // Clean up Redis keys
//       await redis.del(MIGRATION_KEY, ERROR_KEY);
//     }
//   } catch (error) {
//     console.error("Migration failed:", error);
//   } finally {
//     process.exit(0);
//   }
// }

// // Run migration
// migrateVenuesToPostgres();
