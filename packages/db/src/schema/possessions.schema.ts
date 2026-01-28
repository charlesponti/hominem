import {
  boolean,
  doublePrecision,
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import { categories } from './categories.schema'
import { companies } from './company.schema'
import { users } from './users.schema'

export const possessions = pgTable(
  'possessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    dateAcquired: timestamp('date_acquired').notNull(),
    dateSold: timestamp('date_sold'),
    brandId: uuid('brand_id').references(() => companies.id),
    categoryId: uuid('category_id')
      .references(() => categories.id)
      .notNull(),
    purchasePrice: doublePrecision('purchase_price').notNull(),
    salePrice: doublePrecision('sale_price'),
    url: text('url'),
    color: text('color'),
    imageUrl: text('image_url'),
    modelName: text('model_name'),
    modelNumber: text('model_number'),
    serialNumber: text('serial_number'),
    notes: text('notes'),
    size: text('size'),
    fromUserId: uuid('from_user_id').references(() => users.id),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    isArchived: boolean('is_archived').default(false).notNull(),
    tags: jsonb('tags').$type<string[]>().default([]),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'possessions_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.fromUserId],
      foreignColumns: [users.id],
      name: 'possessions_from_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.brandId],
      foreignColumns: [companies.id],
      name: 'possessions_brand_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'possessions_category_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
)

export const possessionRelations = relations(possessions, ({ one }) => ({
  brand: one(companies, {
    fields: [possessions.brandId],
    references: [companies.id],
  }),
  category: one(categories, {
    fields: [possessions.categoryId],
    references: [categories.id],
  }),
  fromUser: one(users, {
    fields: [possessions.fromUserId],
    references: [users.id],
    relationName: 'from_user',
  }),
  user: one(users, {
    fields: [possessions.userId],
    references: [users.id],
  }),
}))

export interface Possession {
  id: string;
  name: string;
  description: string | null;
  dateAcquired: Date;
  dateSold: Date | null;
  brandId: string | null;
  categoryId: string;
  purchasePrice: number;
  salePrice: number | null;
  url: string | null;
  color: string | null;
  imageUrl: string | null;
  modelName: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  notes: string | null;
  size: string | null;
  fromUserId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  tags: string[] | null;
}
export type PossessionSelect = Possession;
export interface PossessionInsert {
  id?: string;
  name: string;
  description?: string | null;
  dateAcquired: Date;
  dateSold?: Date | null;
  brandId?: string | null;
  categoryId: string;
  purchasePrice: number;
  salePrice?: number | null;
  url?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  modelName?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  size?: string | null;
  fromUserId?: string | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  isArchived?: boolean;
  tags?: string[];
}
