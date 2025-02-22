import { z } from 'zod'

export const GeocodingSchema = z.object({
  geocoding: z.object({
    version: z.string(),
    attribution: z.string(),
    query: z.object({
      text: z.string(),
      parser: z.string(),
      parsed_text: z.object({
        subject: z.string(),
        locality: z.string(),
      }),
      size: z.number(),
      layers: z.array(z.string()),
      private: z.boolean(),
      lang: z.object({
        name: z.string(),
        iso6391: z.string(),
        iso6393: z.string(),
        via: z.string(),
        defaulted: z.boolean(),
      }),
      querySize: z.number(),
    }),
    engine: z.object({
      name: z.string(),
      author: z.string(),
      version: z.string(),
    }),
    timestamp: z.number(),
  }),
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      properties: z.object({
        id: z.string(),
        gid: z.string(),
        layer: z.string(),
        source: z.string(),
        source_id: z.string(),
        country_code: z.string(),
        name: z.string(),
        accuracy: z.string(),
        country: z.string(),
        country_gid: z.string(),
        country_a: z.string(),
        region: z.string(),
        region_gid: z.string(),
        region_a: z.string(),
        county: z.string(),
        county_gid: z.string(),
        locality: z.string(),
        locality_gid: z.string(),
        postalcode: z.string(),
        continent: z.string(),
        continent_gid: z.string(),
        label: z.string(),
        street: z.string().nullable(),
        addendum: z.object({
          concordances: z.object({
            'dbp:id': z.string(),
            'fb:id': z.string(),
            'fct:id': z.string(),
            'fips:code': z.string(),
            'gn:id': z.number(),
            'gp:id': z.number(),
            'loc:id': z.string(),
            'ne:id': z.number(),
            'nyt:id': z.string(),
            'qs_pg:id': z.number(),
            'uscensus:geoid': z.string(),
            'wd:id': z.string(),
            'wk:page': z.string(),
          }),
        }),
      }),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    })
  ),
})
export type Geocoding = z.infer<typeof GeocodingSchema>

export const LAYERS = ['locality', 'borough', 'neighbourhood', 'county', 'region', 'venue'] as const

type GeoProps = Geocoding['features'][0]['properties']
export type GeocodeFeature = {
  id: string
  name: GeoProps['name']
  coordinates: Geocoding['features'][0]['geometry']['coordinates']
  label: GeoProps['label']
  locality: GeoProps['locality']
  layer: GeoProps['layer']
  street: GeoProps['street']
  region: GeoProps['region']
  address: string
}

export const formatGeocodeFeatures = (data: Geocoding): GeocodeFeature[] => {
  return data.features.map((loc) => ({
    id: loc.properties.id,
    name: loc.properties.name,
    coordinates: loc.geometry.coordinates,
    label: loc.properties.label,
    locality: loc.properties.locality,
    layer: loc.properties.layer,
    street: loc.properties.street,
    region: loc.properties.region,
    address: [
      loc.properties.street,
      loc.properties.locality,
      loc.properties.region,
      loc.properties.postalcode,
    ]
      .filter(Boolean)
      .join(', '),
  }))
}
