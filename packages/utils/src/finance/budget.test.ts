import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { budgetCategories, users } from '../db/schema'

describe('Budget Categories Unique Constraint', () => {
  const testUserId = crypto.randomUUID()
  const testUserId2 = crypto.randomUUID()

  // Create test users before each test
  beforeEach(async () => {
    await db
      .insert(users)
      .values([
        {
          id: testUserId,
          email: 'test1@example.com',
          name: 'Test User 1',
        },
        {
          id: testUserId2,
          email: 'test2@example.com',
          name: 'Test User 2',
        },
      ])
      .onConflictDoNothing()
  })

  // Clean up test data
  afterEach(async () => {
    await db.delete(budgetCategories).where(eq(budgetCategories.userId, testUserId))
    await db.delete(budgetCategories).where(eq(budgetCategories.userId, testUserId2))
    await db.delete(users).where(eq(users.id, testUserId))
    await db.delete(users).where(eq(users.id, testUserId2))
  })

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
      .returning()

    expect(category1).toHaveLength(1)
    expect(category1[0].name).toBe('Housing')

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
      .returning()

    expect(category2).toHaveLength(1)
    expect(category2[0].name).toBe('Food')
  })

  it('should prevent creating categories with duplicate names for the same user', async () => {
    // Create first category
    await db.insert(budgetCategories).values({
      id: crypto.randomUUID(),
      name: 'Housing',
      type: 'expense',
      averageMonthlyExpense: '2000',
      userId: testUserId,
    })

    // Attempt to create duplicate should fail
    await expect(
      db.insert(budgetCategories).values({
        id: crypto.randomUUID(),
        name: 'Housing', // Same name
        type: 'income',
        averageMonthlyExpense: '1000',
        userId: testUserId, // Same user
      })
    ).rejects.toThrow()
  })

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
      .returning()

    expect(category1).toHaveLength(1)

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
      .returning()

    expect(category2).toHaveLength(1)
    expect(category2[0].name).toBe('Housing')
    expect(category2[0].userId).toBe(testUserId2)
  })

  it('should handle case sensitivity correctly', async () => {
    // Create category with lowercase
    await db.insert(budgetCategories).values({
      id: crypto.randomUUID(),
      name: 'housing',
      type: 'expense',
      averageMonthlyExpense: '2000',
      userId: testUserId,
    })

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
      .returning()

    expect(category).toHaveLength(1)
    expect(category[0].name).toBe('Housing')
  })
})
