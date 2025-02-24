import moment from 'moment'
import type { users } from '../db/schema/users.schema'

interface Expense {
  cost: number
}

/**
 * percentage rate of return of US stock market per year
 */
export function costOverTime(expense: Expense, user: typeof users.$inferSelect) {
  const expectedLifespan = 74
  const age = moment().diff(user.birthday, 'y')
  const yearsLeftToLive = expectedLifespan - age
  return {
    perYear: expense.cost * 12,
    overLifetime: expense.cost * 12 * yearsLeftToLive,
  }
}

/**
 * TODO (@charlesponti) Determine how much a subscription must be worth if it had been invested in stock market.
 */
export function howMuchIfInvested() {
  const stockMarketReturn = 9.8
  return stockMarketReturn
}

export function netWorthCalculator(age: number, salary: number) {
  return (age * salary) / 10
}
