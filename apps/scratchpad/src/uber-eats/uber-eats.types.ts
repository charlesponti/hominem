export interface Order {
  restaurant: string
  numOfItems: number
  price: number
  date: Date
  items?: string[]
}

export interface RestaurantStats {
  visits: number
  total: number
  averageOrderValue: number
  orders: Order[]
}

export interface ScrapeResults {
  total: number
  orderCount: number
  averageOrderValue: number
  restaurants: Record<string, RestaurantStats>
  orders: Order[]
  dateRange: {
    start: Date
    end: Date
  }
}

export interface ScrapeOptions {
  headless?: boolean
  outputFile?: string
  fromDate?: Date
  maxOrders?: number
}
