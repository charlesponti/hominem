// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { db } from "../../data/mongodb";

// type FieldMapping = {
//   currentKey: string;
//   newKey: string;
// };

// async function migrateCollectionFields(
//   collectionName: string,
//   fieldMappings: FieldMapping[]
// ) {
//   const collection = db.collection(collectionName);

//   try {
//     // Create query to find documents that have any of the old fields
//     const query = {
//       $or: fieldMappings.map(({ currentKey }) => ({
//         [currentKey]: { $exists: true },
//       })),
//     };

//     // Count documents that need migration
//     const count = await collection.countDocuments(query);
//     console.log(`Found ${count} records to migrate`);

//     if (count === 0) {
//       console.log("No records need migration");
//       process.exit(0);
//     }

//     // Process in batches
//     const batchSize = 500;
//     let processed = 0;

//     while (processed < count) {
//       const records = await collection.find(query).limit(batchSize).toArray();

//       const operations = records.map((record) => {
//         const $set: Record<string, any> = {};
//         const $unset: Record<string, any> = {};

//         fieldMappings.forEach(({ currentKey, newKey }) => {
//           if (currentKey in record) {
//             $set[newKey] = record[currentKey];
//             $unset[currentKey] = "";
//           }
//         });

//         return {
//           updateOne: {
//             filter: { _id: record._id },
//             update: { $set, $unset },
//           },
//         };
//       });

//       if (operations.length > 0) {
//         const result = await collection.bulkWrite(operations);
//         processed += result.modifiedCount;
//         console.log(`Migrated batch: ${result.modifiedCount} records updated`);
//       }
//     }

//     console.log("Migration completed successfully");
//   } catch (error) {
//     console.error("Migration failed:", error);
//   } finally {
//     process.exit(0);
//   }
// }

// // Example usage:
// const fieldMappings: FieldMapping[] = [
//   { currentKey: "img_url", newKey: "image_url" },
// ];

// migrateCollectionFields("venues", fieldMappings);
