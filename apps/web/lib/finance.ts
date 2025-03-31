export const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(typeof amount === 'string' ? Number.parseFloat(amount) : amount)
}

//!TODO Migrate to `api`
// 2024 Federal Tax Brackets (simplified)
export const federalBrackets = [
  { min: 0, max: 11600, rate: 0.1 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Number.POSITIVE_INFINITY, rate: 0.37 },
]

export type StateTaxRate = {
  rate: number
  name: string
  notes: string
}
export const stateTaxRates: Record<string, StateTaxRate> = {
  CA: {
    rate: 0.093,
    name: 'California',
    notes: 'Progressive tax system, high cost of living',
  },
  NY: {
    rate: 0.085,
    name: 'New York',
    notes: 'Additional local taxes may apply',
  },
  TX: {
    rate: 0,
    name: 'Texas',
    notes: 'No state income tax, higher property taxes',
  },
  FL: {
    rate: 0,
    name: 'Florida',
    notes: 'No state income tax',
  },
  WA: {
    rate: 0,
    name: 'Washington',
    notes: 'No state income tax, high sales tax',
  },
  CO: {
    rate: 0.044,
    name: 'Colorado',
    notes: 'Flat tax rate',
  },
  IL: {
    rate: 0.0495,
    name: 'Illinois',
    notes: 'Flat tax rate',
  },
  MA: {
    rate: 0.05,
    name: 'Massachusetts',
    notes: 'Flat tax rate',
  },
}
export type StateTaxCode = keyof typeof stateTaxRates

export const calculateFederalTax = (amount: number) => {
  let tax = 0
  let remainingIncome = amount

  for (const bracket of federalBrackets) {
    const taxableInBracket = Math.min(Math.max(0, remainingIncome), bracket.max - bracket.min)
    tax += taxableInBracket * bracket.rate
    remainingIncome -= taxableInBracket
    if (remainingIncome <= 0) break
  }

  return tax
}

export const calculateStateTax = (amount: number, stateCode: StateTaxCode) => {
  return amount * stateTaxRates[stateCode].rate
}

export const calculateTakeHome = (amount: number, stateCode: StateTaxCode) => {
  const federalTax = calculateFederalTax(amount)
  const stateTax = calculateStateTax(amount, stateCode)
  return {
    federalTax,
    stateTax,
    takeHome: amount - federalTax - stateTax,
    effectiveTaxRate: ((federalTax + stateTax) / amount) * 100,
  }
}
