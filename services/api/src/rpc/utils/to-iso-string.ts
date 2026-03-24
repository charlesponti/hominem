export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function toIsoStringOr(value: Date | string | null | undefined, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return toIsoString(value);
}
