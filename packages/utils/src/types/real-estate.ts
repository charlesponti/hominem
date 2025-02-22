export type Property = {
  id: number
  address: string
  start_date: string
  end_date: string
  square_feet: number
  contact_email: string
  contact_number: string
}

export type PropertyRent = {
  start_date: string
  end_date: string
  amount: number
  property_id: number
}
