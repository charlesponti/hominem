// US State income tax data for 2026
// Source: LevyIO (https://levyio.com/datasets/state-income-tax-rates-2026.json)
// License: CC BY 4.0 — attribution: LevyIO (levyio.com)
// Auto-generated from state-raw.json — do not edit directly

interface StateBracket {
  min: number;
  max: number;
  rate: number;
}

interface StateData {
  slug: string;
  name: string;
  abbreviation: string;
  taxSystem: 'none' | 'flat' | 'progressive';
  topMarginalRate: number;
  brackets: {
    single: StateBracket[];
    married: StateBracket[];
  };
  stateStandardDeduction: {
    single: number;
    married: number;
  };
}

const SENTINEL = 999_000_000;

function normalize(bracket: StateBracket): StateBracket {
  return {
    min: bracket.min,
    max: bracket.max >= SENTINEL ? Infinity : bracket.max,
    rate: bracket.rate,
  };
}

const STATES: Record<string, StateData> = {
  alabama: {
    slug: 'alabama',
    name: 'Alabama',
    abbreviation: 'AL',
    taxSystem: 'progressive',
    topMarginalRate: 5,
    brackets: {
      single: [
        {
          min: 0,
          max: 500,
          rate: 2,
        },
        {
          min: 500,
          max: 3000,
          rate: 4,
        },
        {
          min: 3000,
          max: 999999999,
          rate: 5,
        },
      ],
      married: [
        {
          min: 0,
          max: 1000,
          rate: 2,
        },
        {
          min: 1000,
          max: 6000,
          rate: 4,
        },
        {
          min: 6000,
          max: 999999999,
          rate: 5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2500,
      married: 7500,
    },
  },
  alaska: {
    slug: 'alaska',
    name: 'Alaska',
    abbreviation: 'AK',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  arizona: {
    slug: 'arizona',
    name: 'Arizona',
    abbreviation: 'AZ',
    taxSystem: 'flat',
    topMarginalRate: 2.5,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 2.5,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 2.5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  arkansas: {
    slug: 'arkansas',
    name: 'Arkansas',
    abbreviation: 'AR',
    taxSystem: 'progressive',
    topMarginalRate: 4.7,
    brackets: {
      single: [
        {
          min: 0,
          max: 4400,
          rate: 0,
        },
        {
          min: 4400,
          max: 8800,
          rate: 2,
        },
        {
          min: 8800,
          max: 13100,
          rate: 3,
        },
        {
          min: 13100,
          max: 22200,
          rate: 3.4,
        },
        {
          min: 22200,
          max: 38500,
          rate: 4.4,
        },
        {
          min: 38500,
          max: 999999999,
          rate: 4.7,
        },
      ],
      married: [
        {
          min: 0,
          max: 4400,
          rate: 0,
        },
        {
          min: 4400,
          max: 8800,
          rate: 2,
        },
        {
          min: 8800,
          max: 13100,
          rate: 3,
        },
        {
          min: 13100,
          max: 22200,
          rate: 3.4,
        },
        {
          min: 22200,
          max: 38500,
          rate: 4.4,
        },
        {
          min: 38500,
          max: 999999999,
          rate: 4.7,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2340,
      married: 4680,
    },
  },
  california: {
    slug: 'california',
    name: 'California',
    abbreviation: 'CA',
    taxSystem: 'progressive',
    topMarginalRate: 13.3,
    brackets: {
      single: [
        {
          min: 0,
          max: 10412,
          rate: 1,
        },
        {
          min: 10412,
          max: 24684,
          rate: 2,
        },
        {
          min: 24684,
          max: 38959,
          rate: 4,
        },
        {
          min: 38959,
          max: 54081,
          rate: 6,
        },
        {
          min: 54081,
          max: 68350,
          rate: 8,
        },
        {
          min: 68350,
          max: 349137,
          rate: 9.3,
        },
        {
          min: 349137,
          max: 418961,
          rate: 10.3,
        },
        {
          min: 418961,
          max: 698271,
          rate: 11.3,
        },
        {
          min: 698271,
          max: 1000000,
          rate: 12.3,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 13.3,
        },
      ],
      married: [
        {
          min: 0,
          max: 20824,
          rate: 1,
        },
        {
          min: 20824,
          max: 49368,
          rate: 2,
        },
        {
          min: 49368,
          max: 77918,
          rate: 4,
        },
        {
          min: 77918,
          max: 108162,
          rate: 6,
        },
        {
          min: 108162,
          max: 136700,
          rate: 8,
        },
        {
          min: 136700,
          max: 698274,
          rate: 9.3,
        },
        {
          min: 698274,
          max: 837922,
          rate: 10.3,
        },
        {
          min: 837922,
          max: 1396542,
          rate: 11.3,
        },
        {
          min: 1396542,
          max: 2000000,
          rate: 12.3,
        },
        {
          min: 2000000,
          max: 999999999,
          rate: 13.3,
        },
      ],
    },
    stateStandardDeduction: {
      single: 5540,
      married: 11080,
    },
  },
  colorado: {
    slug: 'colorado',
    name: 'Colorado',
    abbreviation: 'CO',
    taxSystem: 'flat',
    topMarginalRate: 4.4,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 4.4,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 4.4,
        },
      ],
    },
    stateStandardDeduction: {
      single: 15000,
      married: 30000,
    },
  },
  connecticut: {
    slug: 'connecticut',
    name: 'Connecticut',
    abbreviation: 'CT',
    taxSystem: 'progressive',
    topMarginalRate: 6.99,
    brackets: {
      single: [
        {
          min: 0,
          max: 10000,
          rate: 3,
        },
        {
          min: 10000,
          max: 50000,
          rate: 5,
        },
        {
          min: 50000,
          max: 100000,
          rate: 5.5,
        },
        {
          min: 100000,
          max: 200000,
          rate: 6,
        },
        {
          min: 200000,
          max: 250000,
          rate: 6.5,
        },
        {
          min: 250000,
          max: 500000,
          rate: 6.9,
        },
        {
          min: 500000,
          max: 999999999,
          rate: 6.99,
        },
      ],
      married: [
        {
          min: 0,
          max: 20000,
          rate: 3,
        },
        {
          min: 20000,
          max: 100000,
          rate: 5,
        },
        {
          min: 100000,
          max: 200000,
          rate: 5.5,
        },
        {
          min: 200000,
          max: 400000,
          rate: 6,
        },
        {
          min: 400000,
          max: 500000,
          rate: 6.5,
        },
        {
          min: 500000,
          max: 1000000,
          rate: 6.9,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 6.99,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  delaware: {
    slug: 'delaware',
    name: 'Delaware',
    abbreviation: 'DE',
    taxSystem: 'progressive',
    topMarginalRate: 6.6,
    brackets: {
      single: [
        {
          min: 0,
          max: 2000,
          rate: 0,
        },
        {
          min: 2000,
          max: 5000,
          rate: 2.2,
        },
        {
          min: 5000,
          max: 10000,
          rate: 3.9,
        },
        {
          min: 10000,
          max: 20000,
          rate: 4.8,
        },
        {
          min: 20000,
          max: 25000,
          rate: 5.2,
        },
        {
          min: 25000,
          max: 60000,
          rate: 5.55,
        },
        {
          min: 60000,
          max: 999999999,
          rate: 6.6,
        },
      ],
      married: [
        {
          min: 0,
          max: 2000,
          rate: 0,
        },
        {
          min: 2000,
          max: 5000,
          rate: 2.2,
        },
        {
          min: 5000,
          max: 10000,
          rate: 3.9,
        },
        {
          min: 10000,
          max: 20000,
          rate: 4.8,
        },
        {
          min: 20000,
          max: 25000,
          rate: 5.2,
        },
        {
          min: 25000,
          max: 60000,
          rate: 5.55,
        },
        {
          min: 60000,
          max: 999999999,
          rate: 6.6,
        },
      ],
    },
    stateStandardDeduction: {
      single: 3250,
      married: 6500,
    },
  },
  'district-of-columbia': {
    slug: 'district-of-columbia',
    name: 'District of Columbia',
    abbreviation: 'DC',
    taxSystem: 'progressive',
    topMarginalRate: 10.75,
    brackets: {
      single: [
        {
          min: 0,
          max: 10000,
          rate: 4,
        },
        {
          min: 10000,
          max: 40000,
          rate: 6,
        },
        {
          min: 40000,
          max: 60000,
          rate: 6.5,
        },
        {
          min: 60000,
          max: 250000,
          rate: 8.5,
        },
        {
          min: 250000,
          max: 500000,
          rate: 9.25,
        },
        {
          min: 500000,
          max: 1000000,
          rate: 9.75,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 10.75,
        },
      ],
      married: [
        {
          min: 0,
          max: 10000,
          rate: 4,
        },
        {
          min: 10000,
          max: 40000,
          rate: 6,
        },
        {
          min: 40000,
          max: 60000,
          rate: 6.5,
        },
        {
          min: 60000,
          max: 250000,
          rate: 8.5,
        },
        {
          min: 250000,
          max: 500000,
          rate: 9.25,
        },
        {
          min: 500000,
          max: 1000000,
          rate: 9.75,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 10.75,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  florida: {
    slug: 'florida',
    name: 'Florida',
    abbreviation: 'FL',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  georgia: {
    slug: 'georgia',
    name: 'Georgia',
    abbreviation: 'GA',
    taxSystem: 'flat',
    topMarginalRate: 5.19,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 5.19,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 5.19,
        },
      ],
    },
    stateStandardDeduction: {
      single: 12000,
      married: 24000,
    },
  },
  hawaii: {
    slug: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HI',
    taxSystem: 'progressive',
    topMarginalRate: 11,
    brackets: {
      single: [
        {
          min: 0,
          max: 2400,
          rate: 1.4,
        },
        {
          min: 2400,
          max: 4800,
          rate: 3.2,
        },
        {
          min: 4800,
          max: 9600,
          rate: 5.5,
        },
        {
          min: 9600,
          max: 14400,
          rate: 6.4,
        },
        {
          min: 14400,
          max: 19200,
          rate: 6.8,
        },
        {
          min: 19200,
          max: 24000,
          rate: 7.2,
        },
        {
          min: 24000,
          max: 36000,
          rate: 7.6,
        },
        {
          min: 36000,
          max: 48000,
          rate: 7.9,
        },
        {
          min: 48000,
          max: 150000,
          rate: 8.25,
        },
        {
          min: 150000,
          max: 175000,
          rate: 9,
        },
        {
          min: 175000,
          max: 200000,
          rate: 10,
        },
        {
          min: 200000,
          max: 999999999,
          rate: 11,
        },
      ],
      married: [
        {
          min: 0,
          max: 4800,
          rate: 1.4,
        },
        {
          min: 4800,
          max: 9600,
          rate: 3.2,
        },
        {
          min: 9600,
          max: 19200,
          rate: 5.5,
        },
        {
          min: 19200,
          max: 28800,
          rate: 6.4,
        },
        {
          min: 28800,
          max: 38400,
          rate: 6.8,
        },
        {
          min: 38400,
          max: 48000,
          rate: 7.2,
        },
        {
          min: 48000,
          max: 72000,
          rate: 7.6,
        },
        {
          min: 72000,
          max: 96000,
          rate: 7.9,
        },
        {
          min: 96000,
          max: 300000,
          rate: 8.25,
        },
        {
          min: 300000,
          max: 350000,
          rate: 9,
        },
        {
          min: 350000,
          max: 400000,
          rate: 10,
        },
        {
          min: 400000,
          max: 999999999,
          rate: 11,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2200,
      married: 4400,
    },
  },
  idaho: {
    slug: 'idaho',
    name: 'Idaho',
    abbreviation: 'ID',
    taxSystem: 'flat',
    topMarginalRate: 5.8,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 5.8,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 5.8,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  illinois: {
    slug: 'illinois',
    name: 'Illinois',
    abbreviation: 'IL',
    taxSystem: 'flat',
    topMarginalRate: 4.95,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 4.95,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 4.95,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2925,
      married: 5850,
    },
  },
  indiana: {
    slug: 'indiana',
    name: 'Indiana',
    abbreviation: 'IN',
    taxSystem: 'flat',
    topMarginalRate: 3.05,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 3.05,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 3.05,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  iowa: {
    slug: 'iowa',
    name: 'Iowa',
    abbreviation: 'IA',
    taxSystem: 'flat',
    topMarginalRate: 3.8,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 3.8,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 3.8,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  kansas: {
    slug: 'kansas',
    name: 'Kansas',
    abbreviation: 'KS',
    taxSystem: 'progressive',
    topMarginalRate: 5.7,
    brackets: {
      single: [
        {
          min: 0,
          max: 15000,
          rate: 3.1,
        },
        {
          min: 15000,
          max: 30000,
          rate: 5.25,
        },
        {
          min: 30000,
          max: 999999999,
          rate: 5.7,
        },
      ],
      married: [
        {
          min: 0,
          max: 30000,
          rate: 3.1,
        },
        {
          min: 30000,
          max: 60000,
          rate: 5.25,
        },
        {
          min: 60000,
          max: 999999999,
          rate: 5.7,
        },
      ],
    },
    stateStandardDeduction: {
      single: 3500,
      married: 8000,
    },
  },
  kentucky: {
    slug: 'kentucky',
    name: 'Kentucky',
    abbreviation: 'KY',
    taxSystem: 'flat',
    topMarginalRate: 4,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 4,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 4,
        },
      ],
    },
    stateStandardDeduction: {
      single: 3160,
      married: 6320,
    },
  },
  louisiana: {
    slug: 'louisiana',
    name: 'Louisiana',
    abbreviation: 'LA',
    taxSystem: 'flat',
    topMarginalRate: 3,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 3,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 3,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  maine: {
    slug: 'maine',
    name: 'Maine',
    abbreviation: 'ME',
    taxSystem: 'progressive',
    topMarginalRate: 7.15,
    brackets: {
      single: [
        {
          min: 0,
          max: 24500,
          rate: 5.8,
        },
        {
          min: 24500,
          max: 58050,
          rate: 6.75,
        },
        {
          min: 58050,
          max: 999999999,
          rate: 7.15,
        },
      ],
      married: [
        {
          min: 0,
          max: 49050,
          rate: 5.8,
        },
        {
          min: 49050,
          max: 116100,
          rate: 6.75,
        },
        {
          min: 116100,
          max: 999999999,
          rate: 7.15,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  maryland: {
    slug: 'maryland',
    name: 'Maryland',
    abbreviation: 'MD',
    taxSystem: 'progressive',
    topMarginalRate: 5.75,
    brackets: {
      single: [
        {
          min: 0,
          max: 1000,
          rate: 2,
        },
        {
          min: 1000,
          max: 2000,
          rate: 3,
        },
        {
          min: 2000,
          max: 3000,
          rate: 4,
        },
        {
          min: 3000,
          max: 100000,
          rate: 4.75,
        },
        {
          min: 100000,
          max: 125000,
          rate: 5,
        },
        {
          min: 125000,
          max: 150000,
          rate: 5.25,
        },
        {
          min: 150000,
          max: 250000,
          rate: 5.5,
        },
        {
          min: 250000,
          max: 999999999,
          rate: 5.75,
        },
      ],
      married: [
        {
          min: 0,
          max: 1000,
          rate: 2,
        },
        {
          min: 1000,
          max: 2000,
          rate: 3,
        },
        {
          min: 2000,
          max: 3000,
          rate: 4,
        },
        {
          min: 3000,
          max: 150000,
          rate: 4.75,
        },
        {
          min: 150000,
          max: 175000,
          rate: 5,
        },
        {
          min: 175000,
          max: 225000,
          rate: 5.25,
        },
        {
          min: 225000,
          max: 300000,
          rate: 5.5,
        },
        {
          min: 300000,
          max: 999999999,
          rate: 5.75,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2550,
      married: 5150,
    },
  },
  massachusetts: {
    slug: 'massachusetts',
    name: 'Massachusetts',
    abbreviation: 'MA',
    taxSystem: 'flat',
    topMarginalRate: 5,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 5,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  michigan: {
    slug: 'michigan',
    name: 'Michigan',
    abbreviation: 'MI',
    taxSystem: 'flat',
    topMarginalRate: 4.25,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 4.25,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 4.25,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  minnesota: {
    slug: 'minnesota',
    name: 'Minnesota',
    abbreviation: 'MN',
    taxSystem: 'progressive',
    topMarginalRate: 9.85,
    brackets: {
      single: [
        {
          min: 0,
          max: 31690,
          rate: 5.35,
        },
        {
          min: 31690,
          max: 104090,
          rate: 6.8,
        },
        {
          min: 104090,
          max: 193240,
          rate: 7.85,
        },
        {
          min: 193240,
          max: 999999999,
          rate: 9.85,
        },
      ],
      married: [
        {
          min: 0,
          max: 46330,
          rate: 5.35,
        },
        {
          min: 46330,
          max: 184040,
          rate: 6.8,
        },
        {
          min: 184040,
          max: 321450,
          rate: 7.85,
        },
        {
          min: 321450,
          max: 999999999,
          rate: 9.85,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14575,
      married: 29150,
    },
  },
  mississippi: {
    slug: 'mississippi',
    name: 'Mississippi',
    abbreviation: 'MS',
    taxSystem: 'flat',
    topMarginalRate: 4,
    brackets: {
      single: [
        {
          min: 0,
          max: 10000,
          rate: 0,
        },
        {
          min: 10000,
          max: 999999999,
          rate: 4,
        },
      ],
      married: [
        {
          min: 0,
          max: 10000,
          rate: 0,
        },
        {
          min: 10000,
          max: 999999999,
          rate: 4,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2300,
      married: 4600,
    },
  },
  missouri: {
    slug: 'missouri',
    name: 'Missouri',
    abbreviation: 'MO',
    taxSystem: 'progressive',
    topMarginalRate: 4.7,
    brackets: {
      single: [
        {
          min: 0,
          max: 1313,
          rate: 0,
        },
        {
          min: 1313,
          max: 2626,
          rate: 2,
        },
        {
          min: 2626,
          max: 3939,
          rate: 2.5,
        },
        {
          min: 3939,
          max: 5252,
          rate: 3,
        },
        {
          min: 5252,
          max: 6565,
          rate: 3.5,
        },
        {
          min: 6565,
          max: 7878,
          rate: 4,
        },
        {
          min: 7878,
          max: 9191,
          rate: 4.5,
        },
        {
          min: 9191,
          max: 999999999,
          rate: 4.7,
        },
      ],
      married: [
        {
          min: 0,
          max: 1313,
          rate: 0,
        },
        {
          min: 1313,
          max: 2626,
          rate: 2,
        },
        {
          min: 2626,
          max: 3939,
          rate: 2.5,
        },
        {
          min: 3939,
          max: 5252,
          rate: 3,
        },
        {
          min: 5252,
          max: 6565,
          rate: 3.5,
        },
        {
          min: 6565,
          max: 7878,
          rate: 4,
        },
        {
          min: 7878,
          max: 9191,
          rate: 4.5,
        },
        {
          min: 9191,
          max: 999999999,
          rate: 4.7,
        },
      ],
    },
    stateStandardDeduction: {
      single: 15750,
      married: 31500,
    },
  },
  montana: {
    slug: 'montana',
    name: 'Montana',
    abbreviation: 'MT',
    taxSystem: 'progressive',
    topMarginalRate: 5.9,
    brackets: {
      single: [
        {
          min: 0,
          max: 21100,
          rate: 4.7,
        },
        {
          min: 21100,
          max: 999999999,
          rate: 5.9,
        },
      ],
      married: [
        {
          min: 0,
          max: 42200,
          rate: 4.7,
        },
        {
          min: 42200,
          max: 999999999,
          rate: 5.9,
        },
      ],
    },
    stateStandardDeduction: {
      single: 16100,
      married: 32200,
    },
  },
  nebraska: {
    slug: 'nebraska',
    name: 'Nebraska',
    abbreviation: 'NE',
    taxSystem: 'progressive',
    topMarginalRate: 4.55,
    brackets: {
      single: [
        {
          min: 0,
          max: 4130,
          rate: 2.46,
        },
        {
          min: 4130,
          max: 24760,
          rate: 3.51,
        },
        {
          min: 24760,
          max: 39900,
          rate: 4.55,
        },
        {
          min: 39900,
          max: 999999999,
          rate: 4.55,
        },
      ],
      married: [
        {
          min: 0,
          max: 8250,
          rate: 2.46,
        },
        {
          min: 8250,
          max: 49530,
          rate: 3.51,
        },
        {
          min: 49530,
          max: 79800,
          rate: 4.55,
        },
        {
          min: 79800,
          max: 999999999,
          rate: 4.55,
        },
      ],
    },
    stateStandardDeduction: {
      single: 8850,
      married: 17700,
    },
  },
  nevada: {
    slug: 'nevada',
    name: 'Nevada',
    abbreviation: 'NV',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  'new-hampshire': {
    slug: 'new-hampshire',
    name: 'New Hampshire',
    abbreviation: 'NH',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  'new-jersey': {
    slug: 'new-jersey',
    name: 'New Jersey',
    abbreviation: 'NJ',
    taxSystem: 'progressive',
    topMarginalRate: 10.75,
    brackets: {
      single: [
        {
          min: 0,
          max: 20000,
          rate: 1.4,
        },
        {
          min: 20000,
          max: 35000,
          rate: 1.75,
        },
        {
          min: 35000,
          max: 40000,
          rate: 3.5,
        },
        {
          min: 40000,
          max: 75000,
          rate: 5.525,
        },
        {
          min: 75000,
          max: 500000,
          rate: 6.37,
        },
        {
          min: 500000,
          max: 1000000,
          rate: 8.97,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 10.75,
        },
      ],
      married: [
        {
          min: 0,
          max: 20000,
          rate: 1.4,
        },
        {
          min: 20000,
          max: 50000,
          rate: 1.75,
        },
        {
          min: 50000,
          max: 70000,
          rate: 2.45,
        },
        {
          min: 70000,
          max: 80000,
          rate: 3.5,
        },
        {
          min: 80000,
          max: 150000,
          rate: 5.525,
        },
        {
          min: 150000,
          max: 500000,
          rate: 6.37,
        },
        {
          min: 500000,
          max: 1000000,
          rate: 8.97,
        },
        {
          min: 1000000,
          max: 999999999,
          rate: 10.75,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  'new-mexico': {
    slug: 'new-mexico',
    name: 'New Mexico',
    abbreviation: 'NM',
    taxSystem: 'progressive',
    topMarginalRate: 5.9,
    brackets: {
      single: [
        {
          min: 0,
          max: 5500,
          rate: 1.7,
        },
        {
          min: 5500,
          max: 11000,
          rate: 3.2,
        },
        {
          min: 11000,
          max: 16000,
          rate: 4.7,
        },
        {
          min: 16000,
          max: 210000,
          rate: 4.9,
        },
        {
          min: 210000,
          max: 999999999,
          rate: 5.9,
        },
      ],
      married: [
        {
          min: 0,
          max: 8000,
          rate: 1.7,
        },
        {
          min: 8000,
          max: 16000,
          rate: 3.2,
        },
        {
          min: 16000,
          max: 24000,
          rate: 4.7,
        },
        {
          min: 24000,
          max: 315000,
          rate: 4.9,
        },
        {
          min: 315000,
          max: 999999999,
          rate: 5.9,
        },
      ],
    },
    stateStandardDeduction: {
      single: 14600,
      married: 29200,
    },
  },
  'new-york': {
    slug: 'new-york',
    name: 'New York',
    abbreviation: 'NY',
    taxSystem: 'progressive',
    topMarginalRate: 10.9,
    brackets: {
      single: [
        {
          min: 0,
          max: 8500,
          rate: 4,
        },
        {
          min: 8500,
          max: 11700,
          rate: 4.5,
        },
        {
          min: 11700,
          max: 13900,
          rate: 5.25,
        },
        {
          min: 13900,
          max: 80650,
          rate: 5.5,
        },
        {
          min: 80650,
          max: 215400,
          rate: 6,
        },
        {
          min: 215400,
          max: 1077550,
          rate: 6.85,
        },
        {
          min: 1077550,
          max: 5000000,
          rate: 9.65,
        },
        {
          min: 5000000,
          max: 25000000,
          rate: 10.3,
        },
        {
          min: 25000000,
          max: 999999999,
          rate: 10.9,
        },
      ],
      married: [
        {
          min: 0,
          max: 17150,
          rate: 4,
        },
        {
          min: 17150,
          max: 23600,
          rate: 4.5,
        },
        {
          min: 23600,
          max: 27900,
          rate: 5.25,
        },
        {
          min: 27900,
          max: 161550,
          rate: 5.5,
        },
        {
          min: 161550,
          max: 323200,
          rate: 6,
        },
        {
          min: 323200,
          max: 2155350,
          rate: 6.85,
        },
        {
          min: 2155350,
          max: 5000000,
          rate: 9.65,
        },
        {
          min: 5000000,
          max: 25000000,
          rate: 10.3,
        },
        {
          min: 25000000,
          max: 999999999,
          rate: 10.9,
        },
      ],
    },
    stateStandardDeduction: {
      single: 8000,
      married: 16050,
    },
  },
  'north-carolina': {
    slug: 'north-carolina',
    name: 'North Carolina',
    abbreviation: 'NC',
    taxSystem: 'flat',
    topMarginalRate: 3.99,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 3.99,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 3.99,
        },
      ],
    },
    stateStandardDeduction: {
      single: 12750,
      married: 25500,
    },
  },
  'north-dakota': {
    slug: 'north-dakota',
    name: 'North Dakota',
    abbreviation: 'ND',
    taxSystem: 'progressive',
    topMarginalRate: 2.5,
    brackets: {
      single: [
        {
          min: 0,
          max: 48475,
          rate: 0,
        },
        {
          min: 48475,
          max: 244825,
          rate: 1.95,
        },
        {
          min: 244825,
          max: 999999999,
          rate: 2.5,
        },
      ],
      married: [
        {
          min: 0,
          max: 80975,
          rate: 0,
        },
        {
          min: 80975,
          max: 298075,
          rate: 1.95,
        },
        {
          min: 298075,
          max: 999999999,
          rate: 2.5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 16100,
      married: 32200,
    },
  },
  ohio: {
    slug: 'ohio',
    name: 'Ohio',
    abbreviation: 'OH',
    taxSystem: 'progressive',
    topMarginalRate: 3.5,
    brackets: {
      single: [
        {
          min: 0,
          max: 26050,
          rate: 0,
        },
        {
          min: 26050,
          max: 100000,
          rate: 2.75,
        },
        {
          min: 100000,
          max: 999999999,
          rate: 3.5,
        },
      ],
      married: [
        {
          min: 0,
          max: 26050,
          rate: 0,
        },
        {
          min: 26050,
          max: 100000,
          rate: 2.75,
        },
        {
          min: 100000,
          max: 999999999,
          rate: 3.5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  oklahoma: {
    slug: 'oklahoma',
    name: 'Oklahoma',
    abbreviation: 'OK',
    taxSystem: 'progressive',
    topMarginalRate: 4.5,
    brackets: {
      single: [
        {
          min: 0,
          max: 3750,
          rate: 0,
        },
        {
          min: 3750,
          max: 4900,
          rate: 2.5,
        },
        {
          min: 4900,
          max: 7200,
          rate: 3.5,
        },
        {
          min: 7200,
          max: 999999999,
          rate: 4.5,
        },
      ],
      married: [
        {
          min: 0,
          max: 7500,
          rate: 0,
        },
        {
          min: 7500,
          max: 9800,
          rate: 2.5,
        },
        {
          min: 9800,
          max: 14400,
          rate: 3.5,
        },
        {
          min: 14400,
          max: 999999999,
          rate: 4.5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 6350,
      married: 12700,
    },
  },
  oregon: {
    slug: 'oregon',
    name: 'Oregon',
    abbreviation: 'OR',
    taxSystem: 'progressive',
    topMarginalRate: 9.9,
    brackets: {
      single: [
        {
          min: 0,
          max: 4550,
          rate: 4.75,
        },
        {
          min: 4550,
          max: 11400,
          rate: 6.75,
        },
        {
          min: 11400,
          max: 125000,
          rate: 8.75,
        },
        {
          min: 125000,
          max: 999999999,
          rate: 9.9,
        },
      ],
      married: [
        {
          min: 0,
          max: 9100,
          rate: 4.75,
        },
        {
          min: 9100,
          max: 22800,
          rate: 6.75,
        },
        {
          min: 22800,
          max: 250000,
          rate: 8.75,
        },
        {
          min: 250000,
          max: 999999999,
          rate: 9.9,
        },
      ],
    },
    stateStandardDeduction: {
      single: 2910,
      married: 5820,
    },
  },
  pennsylvania: {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    abbreviation: 'PA',
    taxSystem: 'flat',
    topMarginalRate: 3.07,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 3.07,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 3.07,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  'rhode-island': {
    slug: 'rhode-island',
    name: 'Rhode Island',
    abbreviation: 'RI',
    taxSystem: 'progressive',
    topMarginalRate: 5.99,
    brackets: {
      single: [
        {
          min: 0,
          max: 82050,
          rate: 3.75,
        },
        {
          min: 82050,
          max: 186450,
          rate: 4.75,
        },
        {
          min: 186450,
          max: 999999999,
          rate: 5.99,
        },
      ],
      married: [
        {
          min: 0,
          max: 82050,
          rate: 3.75,
        },
        {
          min: 82050,
          max: 186450,
          rate: 4.75,
        },
        {
          min: 186450,
          max: 999999999,
          rate: 5.99,
        },
      ],
    },
    stateStandardDeduction: {
      single: 11200,
      married: 22400,
    },
  },
  'south-carolina': {
    slug: 'south-carolina',
    name: 'South Carolina',
    abbreviation: 'SC',
    taxSystem: 'progressive',
    topMarginalRate: 5.21,
    brackets: {
      single: [
        {
          min: 0,
          max: 30000,
          rate: 1.99,
        },
        {
          min: 30000,
          max: 999999999,
          rate: 5.21,
        },
      ],
      married: [
        {
          min: 0,
          max: 30000,
          rate: 1.99,
        },
        {
          min: 30000,
          max: 999999999,
          rate: 5.21,
        },
      ],
    },
    stateStandardDeduction: {
      single: 15000,
      married: 30000,
    },
  },
  'south-dakota': {
    slug: 'south-dakota',
    name: 'South Dakota',
    abbreviation: 'SD',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  tennessee: {
    slug: 'tennessee',
    name: 'Tennessee',
    abbreviation: 'TN',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  texas: {
    slug: 'texas',
    name: 'Texas',
    abbreviation: 'TX',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  utah: {
    slug: 'utah',
    name: 'Utah',
    abbreviation: 'UT',
    taxSystem: 'flat',
    topMarginalRate: 4.5,
    brackets: {
      single: [
        {
          min: 0,
          max: 999999999,
          rate: 4.5,
        },
      ],
      married: [
        {
          min: 0,
          max: 999999999,
          rate: 4.5,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  vermont: {
    slug: 'vermont',
    name: 'Vermont',
    abbreviation: 'VT',
    taxSystem: 'progressive',
    topMarginalRate: 8.75,
    brackets: {
      single: [
        {
          min: 0,
          max: 45400,
          rate: 3.35,
        },
        {
          min: 45400,
          max: 110050,
          rate: 6.6,
        },
        {
          min: 110050,
          max: 229550,
          rate: 7.6,
        },
        {
          min: 229550,
          max: 999999999,
          rate: 8.75,
        },
      ],
      married: [
        {
          min: 0,
          max: 76000,
          rate: 3.35,
        },
        {
          min: 76000,
          max: 183400,
          rate: 6.6,
        },
        {
          min: 183400,
          max: 279450,
          rate: 7.6,
        },
        {
          min: 279450,
          max: 999999999,
          rate: 8.75,
        },
      ],
    },
    stateStandardDeduction: {
      single: 7000,
      married: 14050,
    },
  },
  virginia: {
    slug: 'virginia',
    name: 'Virginia',
    abbreviation: 'VA',
    taxSystem: 'progressive',
    topMarginalRate: 5.75,
    brackets: {
      single: [
        {
          min: 0,
          max: 3000,
          rate: 2,
        },
        {
          min: 3000,
          max: 5000,
          rate: 3,
        },
        {
          min: 5000,
          max: 17000,
          rate: 5,
        },
        {
          min: 17000,
          max: 999999999,
          rate: 5.75,
        },
      ],
      married: [
        {
          min: 0,
          max: 3000,
          rate: 2,
        },
        {
          min: 3000,
          max: 5000,
          rate: 3,
        },
        {
          min: 5000,
          max: 17000,
          rate: 5,
        },
        {
          min: 17000,
          max: 999999999,
          rate: 5.75,
        },
      ],
    },
    stateStandardDeduction: {
      single: 8000,
      married: 16000,
    },
  },
  washington: {
    slug: 'washington',
    name: 'Washington',
    abbreviation: 'WA',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  'west-virginia': {
    slug: 'west-virginia',
    name: 'West Virginia',
    abbreviation: 'WV',
    taxSystem: 'progressive',
    topMarginalRate: 4.58,
    brackets: {
      single: [
        {
          min: 0,
          max: 10000,
          rate: 2.11,
        },
        {
          min: 10000,
          max: 25000,
          rate: 2.81,
        },
        {
          min: 25000,
          max: 40000,
          rate: 3.16,
        },
        {
          min: 40000,
          max: 60000,
          rate: 4.22,
        },
        {
          min: 60000,
          max: 999999999,
          rate: 4.58,
        },
      ],
      married: [
        {
          min: 0,
          max: 10000,
          rate: 2.11,
        },
        {
          min: 10000,
          max: 25000,
          rate: 2.81,
        },
        {
          min: 25000,
          max: 40000,
          rate: 3.16,
        },
        {
          min: 40000,
          max: 60000,
          rate: 4.22,
        },
        {
          min: 60000,
          max: 999999999,
          rate: 4.58,
        },
      ],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
  wisconsin: {
    slug: 'wisconsin',
    name: 'Wisconsin',
    abbreviation: 'WI',
    taxSystem: 'progressive',
    topMarginalRate: 7.65,
    brackets: {
      single: [
        {
          min: 0,
          max: 15110,
          rate: 3.5,
        },
        {
          min: 15110,
          max: 51950,
          rate: 4.4,
        },
        {
          min: 51950,
          max: 332720,
          rate: 5.3,
        },
        {
          min: 332720,
          max: 999999999,
          rate: 7.65,
        },
      ],
      married: [
        {
          min: 0,
          max: 20150,
          rate: 3.5,
        },
        {
          min: 20150,
          max: 69260,
          rate: 4.4,
        },
        {
          min: 69260,
          max: 443630,
          rate: 5.3,
        },
        {
          min: 443630,
          max: 999999999,
          rate: 7.65,
        },
      ],
    },
    stateStandardDeduction: {
      single: 13960,
      married: 25840,
    },
  },
  wyoming: {
    slug: 'wyoming',
    name: 'Wyoming',
    abbreviation: 'WY',
    taxSystem: 'none',
    topMarginalRate: 0,
    brackets: {
      single: [],
      married: [],
    },
    stateStandardDeduction: {
      single: 0,
      married: 0,
    },
  },
};

const stateMap = new Map<string, StateData>();
for (const key of Object.keys(STATES)) {
  const s = STATES[key];
  stateMap.set(key, {
    ...s,
    brackets: {
      single: s.brackets.single.map(normalize),
      married: s.brackets.married.map(normalize),
    },
  });
}

export function computeStateTax(
  stateSlug: string,
  gross: number,
  status: 'single' | 'married',
): number {
  const state = stateMap.get(stateSlug);
  if (!state || state.taxSystem === 'none') return 0;

  const deduction = state.stateStandardDeduction[status];
  const taxable = Math.max(0, gross - deduction);

  let tax = 0;
  const brackets = state.brackets[status];
  if (brackets.length === 0) return 0;

  for (const bracket of brackets) {
    if (taxable <= bracket.min) break;
    const amountInBracket = Math.min(taxable, bracket.max) - bracket.min;
    if (amountInBracket > 0) {
      tax += amountInBracket * (bracket.rate / 100);
    }
  }
  return tax;
}
