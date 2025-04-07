import { z } from 'zod'

export const LocationSchema = z.object({
  name: z
    .string()
    .describe('Specific name of the location (e.g., "Eiffel Tower", "Central Park")')
    .nullable(),
  city: z
    .string()
    .describe('City where the location is situated (e.g., "Paris", "New York")')
    .nullable(),
  state: z
    .string()
    .describe('State or province of the location (e.g., "California", "Ontario")')
    .nullable(),
  region: z
    .string()
    .describe('Broader geographical region (e.g., "Midwest", "Alps", "Silicon Valley")')
    .nullable(),
  country: z.string().describe('Full country name (e.g., "United States", "Japan")'),
  continent: z
    .string()
    .describe('One of seven continents (e.g., "Europe", "North America", "Asia")')
    .nullable(),
})

export const LocationsSchema = z.array(LocationSchema).describe('Locations mentioned in the text')
export type Locations = z.infer<typeof LocationsSchema>
