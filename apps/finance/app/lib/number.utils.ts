/**
 * Helper function to format currency values consistently
 */
export const formatCurrency = (
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions,
) => {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);

  return numericValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD', // Default to USD, can be overridden by options
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true, // Ensures commas are used for thousands separators
    ...options,
  });
};
