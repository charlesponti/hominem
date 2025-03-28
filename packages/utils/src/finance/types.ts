export interface DateRangeInput {
  from?: string
  to?: string
}

export interface CategoryAggregate {
  category: string
  totalAmount: number
  count: number
}

export interface MonthAggregate {
  month: string
  totalAmount: number
  count: number
}
