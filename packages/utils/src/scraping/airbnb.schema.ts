import { z } from 'zod';

const AirbnbListingSchema = z.object({
  title: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  images: z.array(z.string().url()).optional(),
  host: z
    .object({
      name: z.string().optional(),
      isSuperhost: z.boolean().optional(),
      profileImage: z.string().url().optional(),
      responseRate: z.number().min(0).max(100).optional(),
      responseTime: z.string().optional(),
      yearsHosting: z.number().int().optional(),
    })
    .optional(),
  ratings: z
    .object({
      overall: z.number().min(0).max(5).optional(),
      cleanliness: z.number().min(0).max(5).optional(),
      accuracy: z.number().min(0).max(5).optional(),
      checkin: z.number().min(0).max(5).optional(),
      communication: z.number().min(0).max(5).optional(),
      location: z.number().min(0).max(5).optional(),
      value: z.number().min(0).max(5).optional(),
      totalReviews: z.number().int().optional(),
    })
    .optional(),
  amenities: z.array(z.string()).optional(),
  pricing: z
    .object({
      perNight: z.number().optional(),
      discount: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  booking: z
    .object({
      checkinDate: z.string().optional(),
      checkoutDate: z.string().optional(),
      guests: z.number().int().positive().optional(),
    })
    .optional(),
  description: z.string().optional(),
  sleepingArrangements: z
    .array(
      z
        .object({
          roomType: z.string().optional(),
          beds: z.array(z.string()).optional(),
        })
        .optional(),
    )
    .optional(),
  houseRules: z.array(z.string()).optional(),
  nearbyAttractions: z.array(z.string()).optional(),
});

export default AirbnbListingSchema;
