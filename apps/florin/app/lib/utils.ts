import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to format currency values consistently
 */
export const formatCurrency = (
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions
): string => {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0)

  return numericValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD', // Default to USD, can be overridden by options
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  })
}
