import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
});

export type Company = InferSelectModel<typeof companies>;
export type CompanyInsert = InferInsertModel<typeof companies>;
export type CompanySelect = Company;
export type NewCompany = CompanyInsert;
