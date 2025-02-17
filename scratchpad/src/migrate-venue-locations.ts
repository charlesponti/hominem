// import { db } from "../lib/data/mongodb";

// async function migrateVenueLocations() {
//   const collection = db.collection("venues");

//   try {
//     // Get all venues that don't have a location field
//     const venues = await collection
//       .find({
//         location: { $exists: false },
//         latitude: { $exists: true },
//         longitude: { $exists: true },
//       })
//       .toArray();

//     console.log(`Found ${venues.length} venues to migrate`);

//     if (venues.length === 0) {
//       console.log("No venues need migration");
//       process.exit(0);
//     }

//     const operations = venues.map((venue) => ({
//       updateOne: {
//         filter: { _id: venue._id },
//         update: {
//           $set: {
//             location: {
//               type: "Point",
//               coordinates: [venue.longitude, venue.latitude],
//             },
//           },
//         },
//       },
//     }));

//     // Process in batches of 500 to avoid memory issues
//     const batchSize = 500;
//     for (let i = 0; i < operations.length; i += batchSize) {
//       const batch = operations.slice(i, i + batchSize);
//       const result = await collection.bulkWrite(batch);
//       console.log(
//         `Migrated batch ${i / batchSize + 1}: ${
//           result.modifiedCount
//         } venues updated`
//       );
//     }

//     // Create geospatial index if it doesn't exist
//     await collection.createIndex({ location: "2dsphere" });

//     console.log("Migration completed successfully");
//   } catch (error) {
//     console.error("Migration failed:", error);
//   } finally {
//     process.exit(0);
//   }
// }

// // Run migration
// migrateVenueLocations();
