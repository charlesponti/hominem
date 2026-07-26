// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { computeBreakeven } from '../breakeven';
import { computeCola } from '../cola';
import { compareOffers } from '../index';
import { computeMovingCosts } from '../moving';
import { projectNetWorth } from '../net-worth';
import { computeUSTax, computeUKTax } from '../tax';

describe('LA vs London — real case from comparison doc', () => {
  it('computes LA tax correctly', () => {
    const result = computeUSTax(215_000, 'california', 'single');

    expect(result.netMonthly).toBeCloseTo(12_041, -2);
    expect(result.effectiveRate).toBeCloseTo(32.8, 0);
  });

  it('computes UK tax correctly', () => {
    const result = computeUKTax(140_000);

    expect(result.netMonthly).toBeCloseTo(7_166, 0);
    expect(result.netAnnual).toBeCloseTo(85_986, 0);
    expect(result.effectiveRate).toBeCloseTo(38.6, 0);
  });

  it('computes cost of living adjustment LA → London', () => {
    const result = computeCola('los-angeles', 'london', 3_580);

    expect(result.rent).toBe(2_800);
    expect(result.transit).toBe(230);
    expect(result.utilities).toBe(465);
    expect(result.health).toBe(0);
    // variable spend adjusted by colaIndex ratio: 73/100 * 3580 ≈ 2613
    expect(result.variableSpend).toBeCloseTo(2_613, -1);
  });

  it('computes moving costs for LA → London via Paris route', () => {
    const costs = computeMovingCosts({
      origin: 'los-angeles',
      dest: 'london',
      petCount: 1,
      boxCount: 6,
    });

    const paris = costs.find((c) => c.route === 'paris-eurotunnel');
    expect(paris).toBeDefined();
    expect(paris!.total).toBeLessThanOrEqual(6_300);
    expect(paris!.pet).toBe(1_150);

    const cargo = costs.find((c) => c.route === 'direct-cargo');
    expect(cargo).toBeDefined();
    expect(cargo!.total).toBeGreaterThan(paris!.total);
  });

  it('projects net worth correctly for the London scenario', () => {
    // Starting $120k, Sep start → 4 months of ~$4,225/mo = $16,900 added
    // Dec 2026: ~$136,900
    const projection = projectNetWorth(120_000, 4_225, 12);
    expect(projection).toHaveLength(2); // year 0 + year 1
    expect(projection[1].value).toBeGreaterThanOrEqual(170_000);
  });

  it('projects long-term net worth', () => {
    // London base: ~$3,450/mo cash savings + $775/mo pension = ~$4,225/mo total
    const projection = projectNetWorth(120_000, 4_225, 60);
    const year5 = projection.find((p) => p.year === 5);
    expect(year5).toBeDefined();
    // 120k + 60 * 4225 = 373,500
    expect(year5!.value).toBeCloseTo(373_500, -3);
  });

  it('computes breakeven between LA (no job) and London', () => {
    // LA net: $0 (no income)
    // London net: ~$85,986/yr
    // Moving cost (paris route): ~$5,100
    // Bonus target: let's say 10% of £140k = £14k gross
    const result = computeBreakeven(0, 85_986, 5_100, 140_000);
    expect(result.annualGap).toBe(85_986);
    expect(result.monthsToRecoupMove).toBeLessThan(2);
    expect(result.equityToClose).toBe(85_986);
  });

  it('computes full end-to-end comparison', () => {
    const result = compareOffers(
      {
        filingStatus: 'single',
        currentMonthlySpend: 3_580,
        homeCity: 'los-angeles',
        currentSavings: 40_000,
        currentRetirement: 80_000,
        petCount: 1,
      },
      {
        city: 'los-angeles',
        currency: 'USD',
        grossSalary: 0,
        hasBonus: false,
        bonusTargetPct: 0,
        relocationAllowance: 0,
      },
      {
        city: 'london',
        currency: 'GBP',
        grossSalary: 140_000,
        hasBonus: true,
        bonusTargetPct: 10,
        relocationAllowance: 4_000,
      },
    );

    // London monthly net should match ~£7,166/mo
    expect(result.monthly[1].net).toBeCloseTo(7_166, -1);

    // LA (no job): net should be 0, but spending $7k/mo
    expect(result.monthly[0].net).toBe(0);
    expect(result.monthly[0].totalSpend).toBeGreaterThan(0);

    // Net worth projection should show London pulling ahead
    const lastYear = result.netWorth.projection[result.netWorth.projection.length - 1];
    expect(lastYear.offerB).toBeGreaterThan(lastYear.offerA);
  });
});
