/**
 * TransactionQueryBuilder - Type-safe, composable query builder for transactions
 *
 * This builder provides a fluent interface for constructing transaction queries
 * with filtering, sorting, pagination, and full-text search capabilities.
 *
 * Benefits:
 * - Each filter method is independently testable
 * - Type-safe column references
 * - Composable and chainable
 * - Single query for data + counts using window functions
 * - Uses generated search_vector column for fast full-text search
 */

import type { TransactionType } from '@hominem/db/types/finance';
import type { FinanceTransactionOutput } from '@hominem/db/types/finance';

import { db, and, asc, desc, eq, gte, lte, like, sql, type SQL } from '@hominem/db';
import { financeAccounts, transactions } from '@hominem/db/schema/finance';
import { AccountMetadataSchema } from '@hominem/db/schema/shared';

export interface TransactionQueryResult {
  data: Array<
    FinanceTransactionOutput & {
      account: typeof financeAccounts.$inferSelect | null;
    }
  >;
  filteredCount: number;
  totalUserCount: number;
}

interface SortConfig {
  field: 'date' | 'amount' | 'description' | 'category' | 'id';
  direction: 'asc' | 'desc';
}

/**
 * TransactionQueryBuilder provides a fluent interface for building transaction queries.
 *
 * @example
 * ```typescript
 * const result = await new TransactionQueryBuilder(userId)
 *   .filterByDateRange('2024-01-01', '2024-12-31')
 *   .filterByAmount(100, 1000)
 *   .search('coffee shop')
 *   .sort('date', 'desc')
 *   .paginate(25, 0)
 *   .execute();
 * ```
 */
export class TransactionQueryBuilder {
  private conditions: SQL[] = [];
  private sortConfigs: SortConfig[] = [];
  private limitValue = 100;
  private offsetValue = 0;

  constructor(private userId: string) {
    // Always filter by userId and exclude pending/excluded transactions
    this.conditions.push(
      eq(transactions.userId, userId),
      eq(transactions.excluded, false),
      eq(transactions.pending, false),
    );
  }

  /**
   * Filter transactions by date range
   */
  filterByDateRange(from?: string, to?: string): this {
    if (from) {
      this.conditions.push(gte(transactions.date, from));
    }
    if (to) {
      this.conditions.push(lte(transactions.date, to));
    }
    return this;
  }

  /**
   * Filter transactions by amount range
   */
  filterByAmount(min?: number, max?: number): this {
    if (min !== undefined) {
      this.conditions.push(gte(transactions.amount, min.toString()));
    }
    if (max !== undefined) {
      this.conditions.push(lte(transactions.amount, max.toString()));
    }
    return this;
  }

  /**
   * Filter transactions by category (supports multiple categories with OR logic)
   */
  filterByCategory(category?: string | string[]): this {
    if (!category) return this;

    const categories = Array.isArray(category) ? category : [category];
    const categoryConditions = categories.map((cat) => {
      const pattern = `%${cat}%`;
      return sql`(${transactions.category} ILIKE ${pattern} OR ${transactions.parentCategory} ILIKE ${pattern})`;
    });

    if (categoryConditions.length > 0) {
      this.conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }

    return this;
  }

  /**
   * Filter transactions by transaction type
   */
  filterByType(type?: TransactionType): this {
    if (type) {
      this.conditions.push(eq(transactions.type, type));
    }
    return this;
  }

  /**
   * Filter transactions by account (supports both UUID and name search)
   */
  filterByAccount(account?: string): this {
    if (!account) return this;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account);

    if (isUuid) {
      this.conditions.push(eq(transactions.accountId, account));
    } else {
      this.conditions.push(like(financeAccounts.name, `%${account}%`));
    }

    return this;
  }

  /**
   * Filter transactions by description
   */
  filterByDescription(description?: string): this {
    if (description) {
      this.conditions.push(like(transactions.description, `%${description}%`));
    }
    return this;
  }

  /**
   * Filter transactions to include excluded ones
   */
  includeExcluded(include?: boolean): this {
    if (include) {
      // Remove the excluded filter we added in constructor
      this.conditions = this.conditions.filter((c) => c !== eq(transactions.excluded, false));
    }
    return this;
  }

  /**
   * Full-text search across multiple transaction fields using the generated search_vector column
   * This is much faster than rebuilding the tsvector on every query
   */
  search(searchTerm?: string): this {
    if (!searchTerm?.trim()) return this;

    const term = searchTerm.trim();
    this.conditions.push(
      sql`${transactions.searchVector} @@ websearch_to_tsquery('english', ${term})`,
    );

    return this;
  }

  /**
   * Add sorting (can be called multiple times for multi-column sort)
   */
  sort(field: SortConfig['field'], direction: SortConfig['direction'] = 'desc'): this {
    this.sortConfigs.push({ field, direction });
    return this;
  }

  /**
   * Set pagination parameters
   */
  paginate(limit: number, offset: number): this {
    this.limitValue = limit;
    this.offsetValue = offset;
    return this;
  }

  /**
   * Build the WHERE clause from all filters
   */
  private buildWhere(): SQL | undefined {
    return this.conditions.length > 0 ? and(...this.conditions) : undefined;
  }

  /**
   * Build the ORDER BY clause from sort configs
   */
  private buildOrderBy(): SQL[] {
    const orderBy: SQL[] = [];

    // Map field names to actual columns
    const columnMap = {
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      category: transactions.category,
      id: transactions.id,
    };

    // Add user-specified sorts
    for (const { field, direction } of this.sortConfigs) {
      const column = columnMap[field];
      orderBy.push(direction === 'asc' ? asc(column) : desc(column));
    }

    // Default sort by date desc if no sort specified
    if (this.sortConfigs.length === 0) {
      orderBy.push(desc(transactions.date));
    }

    // Always add id as final sort for stable pagination
    const hasIdSort = this.sortConfigs.some((s) => s.field === 'id');
    if (!hasIdSort) {
      orderBy.push(desc(transactions.id));
    }

    return orderBy;
  }

  /**
   * Execute the query and return results with counts
   *
   * Uses a single query with window functions to get:
   * - Paginated transaction data
   * - Filtered count (matching current filters)
   * - Total user count (all non-excluded, non-pending transactions for user)
   */
  async execute(): Promise<TransactionQueryResult> {
    const where = this.buildWhere();
    const orderBy = this.buildOrderBy();

    // Single query for data + filtered count using window function
    const data = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        status: transactions.status,
        category: transactions.category,
        parentCategory: transactions.parentCategory,
        type: transactions.type,
        accountMask: transactions.accountMask,
        note: transactions.note,
        accountId: transactions.accountId,
        userId: transactions.userId,
        merchantName: transactions.merchantName,
        tags: transactions.tags,
        excluded: transactions.excluded,
        pending: transactions.pending,
        recurring: transactions.recurring,
        paymentChannel: transactions.paymentChannel,
        source: transactions.source,
        fromAccountId: transactions.fromAccountId,
        toAccountId: transactions.toAccountId,
        location: transactions.location,
        plaidTransactionId: transactions.plaidTransactionId,
        searchVector: transactions.searchVector,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        account: financeAccounts,
        // Use window function to get total count without separate query
        filteredCount: sql<number>`count(*) OVER()`.mapWith(Number).as('filteredCount'),
      })
      .from(transactions)
      .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(this.limitValue)
      .offset(this.offsetValue);

    // Get total user count (only need this if we got results)
    const totalUserCount =
      data.length > 0
        ? await db
            .select({ count: sql<number>`count(*)::int`.as('count') })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, this.userId),
                eq(transactions.excluded, false),
                eq(transactions.pending, false),
              ),
            )
            .then((res) => res[0]?.count ?? 0)
        : 0;

    return {
      data: data.map(({ filteredCount: _, searchVector: __, ...tx }) => {
        // Normalize account.meta to the strict AccountMetadata shape when present.
        // Guard at runtime: only parse objects (Plaid sometimes stores strings/etc).
        const accountNormalized = tx.account
          ? {
              ...tx.account,
              meta:
                tx.account.meta && typeof tx.account.meta === 'object'
                  ? AccountMetadataSchema.parse(tx.account.meta)
                  : null,
            }
          : null;

        return {
          ...tx,
          account: accountNormalized,
        } as TransactionQueryResult['data'][number];
      }) as TransactionQueryResult['data'],
      filteredCount: data[0]?.filteredCount ?? 0,
      totalUserCount,
    };
  }

  /**
   * Get the SQL query for debugging/testing purposes
   * Note: This is a simplified representation, actual prepared statement may differ
   */
  toSQL(): { where: SQL | undefined; orderBy: SQL[] } {
    return {
      where: this.buildWhere(),
      orderBy: this.buildOrderBy(),
    };
  }
}
