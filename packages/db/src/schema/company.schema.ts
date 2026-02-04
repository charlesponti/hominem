import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  website: text('website').notNull(),
  industry: text('industry').notNull(),
  size: text('size').notNull(),
  location: text('location').notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const CompanyInsertSchema = createInsertSchema(companies);
export const CompanySelectSchema = createSelectSchema(companies);
export type CompanyInsertSchemaType = z.infer<typeof CompanyInsertSchema>;
export type CompanySelectSchemaType = z.infer<typeof CompanySelectSchema>;
export type Company = CompanySelectSchemaType;
export type CompanyInsert = CompanyInsertSchemaType;
export type CompanySelect = Company;
export type NewCompany = CompanyInsert;
