export interface CityData {
  rent: number;
  transit: number;
  utilities: number;
  health: number;
  colaIndex: number;
  currency: 'USD' | 'GBP' | 'EUR';
  stateSlug?: string;
}

const CITIES: Record<string, CityData> = {
  'los-angeles': {
    rent: 3_000,
    transit: 0,
    utilities: 0,
    health: 420,
    colaIndex: 100,
    currency: 'USD',
    stateSlug: 'california',
  },
  london: {
    rent: 2_800,
    transit: 230,
    utilities: 465,
    health: 0,
    colaIndex: 73,
    currency: 'GBP',
  },
  'new-york': {
    rent: 3_800,
    transit: 132,
    utilities: 150,
    health: 500,
    colaIndex: 120,
    currency: 'USD',
    stateSlug: 'new-york',
  },
  'san-francisco': {
    rent: 3_500,
    transit: 81,
    utilities: 140,
    health: 450,
    colaIndex: 125,
    currency: 'USD',
    stateSlug: 'california',
  },
};

export function getCity(slug: string): CityData | undefined {
  return CITIES[slug];
}
