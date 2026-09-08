// 2026 UK Income Tax and National Insurance rates
// Sources: HMRC, UK government

interface UKTaxData {
  personalAllowance: number;
  personalAllowanceTaperThreshold: number;
  personalAllowanceTaperRate: number; // £1 lost per £2 over threshold
  personalAllowanceMin: number; // zero at this income
  bands: Array<{ min: number; max: number; rate: number }>;
}

interface UKNIData {
  primaryThreshold: number;
  upperEarningsLimit: number;
  primaryRate: number; // rate between PT and UEL
  upperRate: number; // rate above UEL
}

// Income Tax bands (applied after Personal Allowance)
const TAX_BANDS = [
  { min: 0, max: 37_700, rate: 20 },
  { min: 37_700, max: 125_140, rate: 40 },
  { min: 125_140, max: Infinity, rate: 45 },
];

const UK_TAX: UKTaxData = {
  personalAllowance: 12_570,
  personalAllowanceTaperThreshold: 100_000,
  personalAllowanceTaperRate: 2, // £1 per £2
  personalAllowanceMin: 125_140,
  bands: TAX_BANDS,
};

const UK_NI: UKNIData = {
  primaryThreshold: 12_570,
  upperEarningsLimit: 50_270,
  primaryRate: 8, // percent
  upperRate: 2, // percent
};

export function computeUKIncomeTax(gross: number): number {
  // Personal Allowance taper
  let allowance = UK_TAX.personalAllowance;
  if (gross > UK_TAX.personalAllowanceTaperThreshold) {
    const excess = gross - UK_TAX.personalAllowanceTaperThreshold;
    const reduction = Math.floor(excess / UK_TAX.personalAllowanceTaperRate);
    allowance = Math.max(0, allowance - reduction);
  }

  const taxable = Math.max(0, gross - allowance);
  let tax = 0;
  for (const band of UK_TAX.bands) {
    if (taxable <= band.min) break;
    const amountInBand = Math.min(taxable, band.max) - band.min;
    if (amountInBand > 0) {
      tax += amountInBand * (band.rate / 100);
    }
  }
  return tax;
}

export function computeUKNationalInsurance(gross: number): number {
  const pt = UK_NI.primaryThreshold;
  const uel = UK_NI.upperEarningsLimit;

  const betweenPTandUEL = Math.max(0, Math.min(gross, uel) - pt);
  const aboveUEL = Math.max(0, gross - uel);

  return betweenPTandUEL * (UK_NI.primaryRate / 100) + aboveUEL * (UK_NI.upperRate / 100);
}
