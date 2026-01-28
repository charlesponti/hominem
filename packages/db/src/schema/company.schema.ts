import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  website: text('website').notNull(),
  industry: text('industry').notNull(),
  size: text('size').notNull(),
  location: text('location').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}
export type CompanySelect = Company;
export interface CompanyInsert {
  id?: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export type NewCompany = CompanyInsert;
