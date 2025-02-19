import { relations } from "drizzle-orm";
import {
	boolean,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { events } from "./calendar.schema";

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", [
	"income",
	"expense",
	"credit",
	"debit",
	"transfer",
	"investment",
]);

export const accountTypeEnum = pgEnum("account_type", [
	"checking",
	"savings",
	"investment",
	"credit",
	"loan",
	"retirement",
]);

// Tables
export const financeAccounts = pgTable("finance_accounts", {
	id: uuid("id").primaryKey(),
	type: accountTypeEnum("type").notNull(),
	balance: numeric("balance").notNull(),
	interestRate: numeric("interest_rate"),
	minimumPayment: numeric("minimum_payment"),
	name: text("name").notNull(),
});

export const transactions = pgTable("transactions", {
	id: uuid("id").primaryKey(),
	type: transactionTypeEnum("type").notNull(),
	amount: numeric("amount").notNull(),
	date: timestamp("date").notNull(),
	description: text("description"),
	fromAccountId: uuid("from_account_id").references(() => financeAccounts.id),
	toAccountId: uuid("to_account_id").references(() => financeAccounts.id),
	eventId: uuid("event_id").references(() => events.id),
	investmentDetails: jsonb("investment_details"),
	status: text("status"),
	category: text("category"),
	parentCategory: text("parent_category"),
	excluded: boolean("excluded").default(false),
	tags: text("tags"),
	accountMask: text("account_mask"),
	note: text("note"),
	recurring: boolean("recurring").default(false),
});

// Relations
export const financeAccountRelations = relations(
	financeAccounts,
	({ many }) => ({
		fromTransactions: many(transactions, { relationName: "fromAccount" }),
		toTransactions: many(transactions, { relationName: "toAccount" }),
	}),
);

export const transactionRelations = relations(transactions, ({ one }) => ({
	fromAccount: one(financeAccounts, {
		fields: [transactions.fromAccountId],
		references: [financeAccounts.id],
		relationName: "fromAccount",
	}),
	toAccount: one(financeAccounts, {
		fields: [transactions.toAccountId],
		references: [financeAccounts.id],
		relationName: "toAccount",
	}),
	event: one(events, {
		fields: [transactions.eventId],
		references: [events.id],
	}),
}));

// Types can be inferred from the tables
export type Transaction = typeof transactions.$inferSelect;
export type FinanceAccount = typeof financeAccounts.$inferSelect;
