import { computeBreakeven } from './breakeven';
import { getCity } from './cities';
import { computeCola } from './cola';
import type { FilingStatus } from './federal';
import { computeMovingCosts } from './moving';
import { projectNetWorth } from './net-worth';
import { computeUSTax, computeUKTax } from './tax';

export interface Person {
  filingStatus: FilingStatus;
  currentMonthlySpend: number;
  homeCity: string;
  currentSavings: number;
  currentRetirement: number;
  petCount: number;
}

export interface Offer {
  city: string;
  currency: 'USD' | 'GBP' | 'EUR';
  grossSalary: number;
  hasBonus: boolean;
  bonusTargetPct: number;
  relocationAllowance: number;
}

export interface MonthlyBreakdown {
  gross: number;
  tax: number;
  net: number;
  rent: number;
  transit: number;
  utilities: number;
  health: number;
  variableSpend: number;
  totalSpend: number;
  cashSavings: number;
  totalDelta: number;
}

export interface OfferComparison {
  monthly: [MonthlyBreakdown, MonthlyBreakdown];
  netWorth: {
    current: number;
    projection: Array<{ year: number; offerA: number; offerB: number }>;
  };
  movingCosts: Array<{
    pet: number;
    shipping: number;
    furniture: number;
    total: number;
    route: string;
  }>;
  breakeven: ReturnType<typeof computeBreakeven>;
}

export function compareOffers(person: Person, offerA: Offer, offerB: Offer): OfferComparison {
  const results: [MonthlyBreakdown, MonthlyBreakdown] = [null!, null!];

  for (const [i, offer] of [offerA, offerB].entries()) {
    const cityData = getCity(offer.city);
    const stateSlug = cityData?.stateSlug ?? offer.city;
    const tax =
      offer.currency === 'GBP'
        ? computeUKTax(offer.grossSalary)
        : computeUSTax(offer.grossSalary, stateSlug, person.filingStatus);

    const cola =
      person.currentMonthlySpend > 0
        ? computeCola(person.homeCity, offer.city, person.currentMonthlySpend)
        : null;

    const rent = cola?.rent ?? 0;
    const transit = cola?.transit ?? 0;
    const utilities = cola?.utilities ?? 0;
    const health = cola?.health ?? 0;
    const variableSpend = cola?.variableSpend ?? 0;
    const totalSpend = cola?.totalMonthly ?? 0;

    const netMonthly = tax.netMonthly;
    const cashSavings = netMonthly - totalSpend;
    const totalDelta = cashSavings + (offer.grossSalary * (offer.bonusTargetPct / 100)) / 12;

    results[i] = {
      gross: offer.grossSalary / 12,
      tax: tax.totalTax / 12,
      net: netMonthly,
      rent,
      transit,
      utilities,
      health,
      variableSpend,
      totalSpend,
      cashSavings,
      totalDelta,
    };
  }

  const moving = computeMovingCosts({
    origin: person.homeCity,
    dest: offerB.city,
    petCount: person.petCount,
    boxCount: 6,
  });

  const projectionMonths = 60;
  const nwA = projectNetWorth(
    person.currentSavings + person.currentRetirement,
    results[0].cashSavings,
    projectionMonths,
  );
  const nwB = projectNetWorth(
    person.currentSavings + person.currentRetirement,
    results[1].cashSavings,
    projectionMonths,
  );

  const projection = nwA.map((p, i) => ({
    year: p.year,
    offerA: p.value,
    offerB: nwB[i]?.value ?? 0,
  }));

  const preferredRoute = moving.length > 1 ? moving[1] : moving[0];
  const breakeven = computeBreakeven(
    results[0].net * 12,
    results[1].net * 12,
    preferredRoute.total,
    offerB.grossSalary,
  );

  return {
    monthly: results,
    netWorth: {
      current: person.currentSavings + person.currentRetirement,
      projection,
    },
    movingCosts: moving.map((m) => ({
      pet: m.pet,
      shipping: m.shipping,
      furniture: m.furniture,
      total: m.total,
      route: m.route,
    })),
    breakeven,
  };
}
