import { db } from '@hominem/db';
import { budgetCategories, users } from '@hominem/db/schema';
import { createTestUser } from '@hominem/db/test/fixtures';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

// Helper to check if DB is available
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.select().from(users).limit(1);
    return true;
  } catch {
    console.warn(
      'Database not available, skipping budget tests. Start test database on port 4433.',
    );
    return false;
  }
}

const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)('Budget Categories Unique Constraint', () => {
  const testUserId = crypto.randomUUID();
  const testUserId2 = crypto.randomUUID();

  beforeEach(async () => {
    // Clean up existing categories before each test
    await db
      .delete(budgetCategories)
      .where(or(eq(budgetCategories.userId, testUserId), eq(budgetCategories.userId, testUserId2)));
    await createTestUser({ id: testUserId, name: 'Test User 1' });
    await createTestUser({ id: testUserId2, name: 'Test User 2' });
  });

  it('should allow creating categories with unique names for the same user', async () => {
    // Create first category
    const category1 = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        name: 'Housing',
        type: 'expense',
        averageMonthlyExpense: '2000',
        userId: testUserId,
      })
      .returning();

    expect(category1).toHaveLength(1);
    expect(category1?.[0]?.name).toBe('Housing');

    // Create second category with different name
    const category2 = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        name: 'Food',
        type: 'expense',
        averageMonthlyExpense: '500',
        userId: testUserId,
      })
      .returning();

    expect(category2).toHaveLength(1);
    expect(category2?.[0]?.name).toBe('Food');
  });

  it('should prevent creating categories with duplicate names for the same user', async () => {
    // Create first category
    await db.insert(budgetCategories).values({
      id: crypto.randomUUID(),
      name: 'Housing',
      type: 'expense',
      averageMonthlyExpense: '2000',
      userId: testUserId,
    });

    // Attempt to create duplicate should fail
    await expect(
      db.insert(budgetCategories).values({
        id: crypto.randomUUID(),
        name: 'Housing', // Same name
        type: 'income',
        averageMonthlyExpense: '1000',
        userId: testUserId, // Same user
      }),
    ).rejects.toThrow();
  });

  it('should allow different users to have categories with the same name', async () => {
    // User 1 creates Housing category
    const category1 = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        name: 'Housing',
        type: 'expense',
        averageMonthlyExpense: '2000',
        userId: testUserId,
      })
      .returning();

    expect(category1).toHaveLength(1);

    // User 2 creates Housing category (should succeed)
    const category2 = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        name: 'Housing', // Same name
        type: 'expense',
        averageMonthlyExpense: '1500',
        userId: testUserId2, // Different user
      })
      .returning();

    expect(category2).toHaveLength(1);
    expect(category2?.[0]?.name).toBe('Housing');
    expect(category2?.[0]?.userId).toBe(testUserId2);
  });

  it('should handle case sensitivity correctly', async () => {
    // Create category with lowercase
    await db.insert(budgetCategories).values({
      id: crypto.randomUUID(),
      name: 'housing',
      type: 'expense',
      averageMonthlyExpense: '2000',
      userId: testUserId,
    });

    // Creating with different case should succeed (constraint is case-sensitive)
    const category = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        name: 'Housing', // Different case
        type: 'expense',
        averageMonthlyExpense: '2000',
        userId: testUserId,
      })
      .returning();

    expect(category).toHaveLength(1);
    expect(category?.[0]?.name).toBe('Housing');
  });
});
