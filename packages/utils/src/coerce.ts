export function nullToUndefined(value: string | null | undefined): string | undefined {
  return value === null ? undefined : value;
}

export function toNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toRequiredNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

export function normalizeOtp(value: string, length = 6): string {
  return value.replace(/\D/g, '').slice(0, length);
}
