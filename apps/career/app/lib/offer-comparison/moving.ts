export interface MovingCosts {
  pet: number;
  shipping: number;
  furniture: number;
  total: number;
  route: 'direct-cargo' | 'paris-eurotunnel';
}

interface MovingInput {
  origin: string;
  dest: string;
  petCount: number;
  boxCount: number;
}

interface RouteBase {
  petPerPet: number;
  shipping: number;
  furniture: number;
  route: MovingCosts['route'];
}

const LA_LDN_ROUTES: Record<string, RouteBase[]> = {
  'los-angeles→london': [
    { petPerPet: 4_000, shipping: 600, furniture: 3_350, route: 'direct-cargo' },
    { petPerPet: 1_150, shipping: 600, furniture: 3_350, route: 'paris-eurotunnel' },
  ],
};

export function computeMovingCosts(input: MovingInput): MovingCosts[] {
  const key = `${input.origin}→${input.dest}`;
  const routeBase = LA_LDN_ROUTES[key];
  if (routeBase) {
    return routeBase.map((r) => {
      const pet = input.petCount * r.petPerPet;
      return { ...r, pet, total: pet + r.shipping + r.furniture };
    });
  }

  const base = {
    pet: input.petCount * 5_000,
    shipping: 150 + input.boxCount * 75,
    furniture: 3_000,
  };

  return [
    {
      ...base,
      total: base.pet + base.shipping + base.furniture,
      route: 'direct-cargo',
    },
  ];
}
