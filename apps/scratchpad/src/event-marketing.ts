/**
 * This module calculates the projected marketing spend required to achieve a desired number of event attendees
 * using social media ads. It considers factors such as conversion rates, cost per click (CPC), and landing page conversion rates.
 */

// Define a type for the input parameters
export interface MarketingProjectionInput {
  desiredAttendees: number // Number of attendees you want to achieve
  conversionRate: number // Percentage of visitors who purchase a ticket (e.g., 0.02 for 2%)
  costPerClick: number // Average cost per click (CPC) in USD
}

// Define a type for the output
export interface MarketingProjectionOutput {
  requiredClicks: number // Number of ad clicks needed
  projectedAdSpend: number // Total projected ad spend in USD
}

/**
 * Function to calculate the projected ad spend based on the number of desired attendees.
 *
 * @param {MarketingProjectionInput} input - The input parameters for the projection.
 * @returns {MarketingProjectionOutput} - The calculated required clicks and projected ad spend.
 *
 * @example
 * const result = calculateMarketingSpend({
 *  desiredAttendees: 500,
 *  conversionRate: 0.02, // 2%
 *  costPerClick: 1.00, // $1 per click
 * });
 * console.log(result); // { requiredClicks: 25000, projectedAdSpend: 25000 }
 */
export function calculateMarketingSpend(
  input: MarketingProjectionInput
): MarketingProjectionOutput {
  const { desiredAttendees, conversionRate, costPerClick } = input

  if (conversionRate <= 0 || conversionRate > 1) {
    throw new Error('Conversion rate must be between 0 and 1 (e.g., 0.02 for 2%)')
  }

  if (costPerClick <= 0) {
    throw new Error('Cost per click must be greater than 0')
  }

  // Calculate the number of clicks needed to achieve the desired number of attendees
  const requiredClicks = Math.ceil(desiredAttendees / conversionRate)

  // Calculate the total projected ad spend
  const projectedAdSpend = requiredClicks * costPerClick

  return {
    requiredClicks,
    projectedAdSpend,
  }
}
