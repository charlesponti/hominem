const { parseModelJson } = require('./json-utils');

module.exports = function (output, context) {
  let parsed;
  try {
    parsed = parseModelJson(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${e.message}` };
  }

  const offers = parsed.offers;
  if (!Array.isArray(offers)) {
    return { pass: false, score: 0, reason: 'Missing "offers" array' };
  }

  if (!parsed.person) {
    return { pass: false, score: 0, reason: 'Missing "person" object' };
  }

  function locMatch(val, expected) {
    if (!val) return false;
    const norm = val.toLowerCase().replace(/[-\s]+/g, ' ');
    return norm.includes(expected.toLowerCase());
  }

  function check(val, expected, label) {
    if (val !== expected) {
      return { pass: false, score: 0, reason: `Expected ${label} = ${JSON.stringify(expected)}, got ${JSON.stringify(val)}` };
    }
    return null;
  }

  function checkLoc(val, expected, label) {
    if (!locMatch(val, expected)) {
      return { pass: false, score: 0, reason: `Expected ${label} matching "${expected}", got ${JSON.stringify(val)}` };
    }
    return null;
  }

  function all(...checks) {
    for (const c of checks) {
      if (c) return c;
    }
    return { pass: true, score: 1, reason: 'Passed' };
  }

  const caseId = context.vars.caseId;
  const o = offers[0] || {};
  const p = parsed.person || {};

  switch (caseId) {
    case 'la-baseline':
      return all(
        check(o.baseSalary, 215000, 'baseSalary'),
        check(o.currency, 'USD', 'currency'),
        checkLoc(o.location, 'los angeles', 'location'),
        p.filingStatus && p.filingStatus !== 'single' ? check(p.filingStatus, 'single', 'filingStatus') : null,
      );

    case 'london-offer':
      return all(
        check(o.baseSalary, 140000, 'baseSalary'),
        check(o.currency, 'GBP', 'currency'),
        check(o.location, 'london', 'location'),
        check(o.requiresVisa, true, 'requiresVisa'),
        check(o.visaType, 'skilled-worker', 'visaType'),
      );

    case 'users-offer-notes':
      return all(
        check(o.baseSalary, 135000, 'baseSalary'),
        check(o.hasEquity, true, 'hasEquity'),
        check(o.hasBonus, true, 'hasBonus'),
        o.relocationAllowance == null ? { pass: false, score: 0, reason: 'Expected relocationAllowance to be set' } : null,
        o.equityGrantTotal == null && o.equityValue == null ? { pass: false, score: 0, reason: 'Expected some equity value to be extracted' } : null,
      );

    case 'ambiguous-currency':
      return all(check(o.currency, 'GBP', 'currency'));

    case 'contradictory-currency':
      return all(
        check(o.currency, null, 'currency'),
        check(o.currencyAmbiguous, true, 'currencyAmbiguous'),
      );

    case 'partial-info':
      return all(
        check(o.baseSalary, 200000, 'baseSalary'),
        checkLoc(o.location, 'new york', 'location'),
      );

    case 'landmark-fidi':
      return all(
        checkLoc(o.location, 'new york', 'location'),
        check(p.filingStatus, 'married', 'filingStatus'),
      );

    case 'equity-rsu-cliff':
      return all(
        check(o.hasEquity, true, 'hasEquity'),
        check(o.equityType, 'rsu', 'equityType'),
        check(o.equityCliff, 1, 'equityCliff'),
        check(o.equityVestingFrequency, 'quarterly', 'equityVestingFrequency'),
      );

    case 'contractor':
      return all(
        o.employmentType === 'contractor' || o.employmentType === 'self-employed'
          ? null : { pass: false, score: 0, reason: `Expected employmentType contractor/self-employed, got ${o.employmentType}` },
        check(p.filingStatus, 'single', 'filingStatus'),
      );

    case 'person-profile':
      return all(
        check(p.currentSavings, 40000, 'currentSavings'),
        check(p.currentRetirement, 80000, 'currentRetirement'),
        check(p.petCount, 1, 'petCount'),
        checkLoc(p.homeCity, 'los angeles', 'homeCity'),
      );

    case 'multi-offer':
      if (offers.length !== 2) return { pass: false, score: 0, reason: `Expected 2 offers, got ${offers.length}` };
      return all(
        check(offers[0].baseSalary, 220000, 'offers[0].baseSalary'),
        checkLoc(offers[0].location, 'new york', 'offers[0].location'),
        check(offers[1].baseSalary, 240000, 'offers[1].baseSalary'),
        checkLoc(offers[1].location, 'san francisco', 'offers[1].location'),
      );
  }

  // ============ Global location tests — generic checker ============

  {
    const expectedCurrency = context.vars.expectedCurrency;
    const expectedLocation = context.vars.expectedLocation;
    const expectedBase = context.vars.expectedBase;
    const checks = [];

    if (expectedCurrency !== undefined) checks.push(check(o.currency, expectedCurrency, 'currency'));
    if (expectedLocation !== undefined) checks.push(checkLoc(o.location, expectedLocation, 'location'));
    if (expectedBase !== undefined) checks.push(check(o.baseSalary, expectedBase, 'baseSalary'));
    if (context.vars.expectNullCurrency) checks.push(check(o.currency, null, 'currency'));
    if (context.vars.expectAmbiguousCurrency) checks.push(check(o.currencyAmbiguous, true, 'currencyAmbiguous'));
    if (context.vars.expectEquity) checks.push(check(o.hasEquity, true, 'hasEquity'));
    if (context.vars.expectBonus) checks.push(check(o.hasBonus, true, 'hasBonus'));
    if (context.vars.expectFilingStatus) checks.push(check(p.filingStatus, context.vars.expectFilingStatus, 'filingStatus'));
    if (context.vars.expectEmploymentType) checks.push(check(o.employmentType, context.vars.expectEmploymentType, 'employmentType'));
    if (context.vars.expectOffersCount) checks.push(check(offers.length, context.vars.expectOffersCount, 'offers.length'));

    if (checks.length === 0) {
      return { pass: false, score: 0, reason: `Unknown caseId: ${caseId}` };
    }

    const result = all(...checks);
    if (result.pass && context.vars.expectedReason) {
      return { pass: true, score: 1, reason: context.vars.expectedReason };
    }
    return result;
  }
};
