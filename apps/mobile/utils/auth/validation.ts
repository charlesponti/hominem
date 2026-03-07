export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function isValidOtp(value: string): boolean {
  const normalized = normalizeOtp(value)
  return /^[0-9]{6}$/.test(normalized)
}
