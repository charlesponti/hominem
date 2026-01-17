// Shared constants and utilities for budget services

export const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

/**
 * Calculate budget status based on percentage spent
 */
export function getBudgetStatus(percentageSpent: number): 'on-track' | 'warning' | 'over-budget' {
  if (percentageSpent > 100) { return 'over-budget' }
  if (percentageSpent > 90) { return 'warning' }
  return 'on-track'
}

/**
 * Get status color based on budget status
 */
export function getStatusColor(status: 'on-track' | 'warning' | 'over-budget'): string {
  switch (status) {
    case 'on-track':
      return '#10b981' // emerald-500
    case 'warning':
      return '#f59e0b' // amber-500
    case 'over-budget':
      return '#ef4444' // red-500
  }
}

/**
 * Get chart color for a given index
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] || '#0088FE'
}
