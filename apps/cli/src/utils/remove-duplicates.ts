// import type { Collection, ObjectId } from "mongodb";
// import { db } from "../lib/data/mongodb";
// import type { Venue } from "../lib/data/schema";

// type MongoVenue = Venue & { _id: ObjectId };
// export async function removeDuplicateVenues() {
//   const collection: Collection<MongoVenue> = db.collection("venues");
//   const pipeline = [
//     {
//       $group: {
//         _id: { title: "$title", address: "$address" },
//         docs: { $push: "$$ROOT" },
//         count: { $sum: 1 },
//       },
//     },
//     {
//       $match: {
//         count: { $gt: 1 },
//       },
//     },
//   ];

//   const duplicates = await db
//     .collection("venues")
//     .aggregate(pipeline)
//     .toArray();

//   let count = 0;

//   for (const group of duplicates) {
//     // Keep the first (most recent) document and delete the rest
//     const [, ...duplicateDocs] = group.docs;
//     const duplicateIds = duplicateDocs.map((doc: MongoVenue) => doc._id);

//     const results = await collection.deleteMany({
//       _id: { $in: duplicateIds },
//     });
//     count += results.deletedCount;
//   }

//   return count;
// }

// removeDuplicateVenues().then((count) => {
//   console.log(`Removed ${count} duplicate venues`);
//   process.exit(1);
// });
