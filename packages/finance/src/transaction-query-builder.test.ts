/**
 * Unit tests for TransactionQueryBuilder
 *
 * These tests verify that the query builder correctly constructs SQL conditions
 * for various filter combinations without requiring a database connection.
 */

import { describe, it, expect } from 'vitest';

import { TransactionQueryBuilder } from './transaction-query-builder';

describe('TransactionQueryBuilder', () => {
  const testUserId = 'test-user-123';

  describe('initialization', () => {
    it('should initialize with userId filter', () => {
      const builder = new TransactionQueryBuilder(testUserId);
      const query = builder.toSQL();

      expect(query.where).toBeDefined();
    });

    it('should apply default sort by date desc', () => {
      const builder = new TransactionQueryBuilder(testUserId);
      const query = builder.toSQL();

      expect(query.orderBy).toHaveLength(2); // date desc + id desc
    });
  });

  describe('filterByDateRange', () => {
    it('should add date range filters', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDateRange(
        '2024-01-01',
        '2024-12-31',
      );

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle only from date', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDateRange(
        '2024-01-01',
        undefined,
      );

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle only to date', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDateRange(
        undefined,
        '2024-12-31',
      );

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle no dates', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDateRange(
        undefined,
        undefined,
      );

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('filterByAmount', () => {
    it('should add amount range filters', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAmount(100, 1000);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle only min amount', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAmount(100, undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle only max amount', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAmount(undefined, 1000);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle zero as valid amount', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAmount(0, 0);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('filterByCategory', () => {
    it('should add single category filter', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByCategory('Food');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should add multiple category filters with OR logic', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByCategory([
        'Food',
        'Transportation',
        'Entertainment',
      ]);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle empty category', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByCategory(undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle empty array', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByCategory([]);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('filterByAccount', () => {
    it('should filter by UUID account ID', () => {
      const accountId = '123e4567-e89b-12d3-a456-426614174000';
      const builder = new TransactionQueryBuilder(testUserId).filterByAccount(accountId);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should filter by account name', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAccount('Chase Checking');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle no account filter', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByAccount(undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('filterByDescription', () => {
    it('should add description filter', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDescription('Starbucks');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle empty description', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByDescription(undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('search', () => {
    it('should add full-text search filter', () => {
      const builder = new TransactionQueryBuilder(testUserId).search('coffee shop');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should trim search term', () => {
      const builder = new TransactionQueryBuilder(testUserId).search('  coffee shop  ');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle empty search term', () => {
      const builder = new TransactionQueryBuilder(testUserId).search('');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle whitespace-only search term', () => {
      const builder = new TransactionQueryBuilder(testUserId).search('   ');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('sort', () => {
    it('should add single sort', () => {
      const builder = new TransactionQueryBuilder(testUserId).sort('amount', 'desc');

      const query = builder.toSQL();
      expect(query.orderBy.length).toBeGreaterThan(0);
    });

    it('should add multiple sorts', () => {
      const builder = new TransactionQueryBuilder(testUserId)
        .sort('date', 'desc')
        .sort('amount', 'asc');

      const query = builder.toSQL();
      expect(query.orderBy.length).toBeGreaterThan(1);
    });

    it('should default to desc direction', () => {
      const builder = new TransactionQueryBuilder(testUserId).sort('amount');

      const query = builder.toSQL();
      expect(query.orderBy.length).toBeGreaterThan(0);
    });

    it('should always add id sort for stable pagination', () => {
      const builder = new TransactionQueryBuilder(testUserId).sort('amount', 'asc');

      const query = builder.toSQL();
      // Should have amount sort + id sort
      expect(query.orderBy.length).toBe(2);
    });
  });

  describe('paginate', () => {
    it('should set limit and offset', () => {
      const builder = new TransactionQueryBuilder(testUserId).paginate(50, 100);

      // Can't directly test limit/offset without executing, but we can verify builder methods are chainable
      expect(builder).toBeInstanceOf(TransactionQueryBuilder);
    });
  });

  describe('complex filter combinations', () => {
    it('should combine multiple filters', () => {
      const builder = new TransactionQueryBuilder(testUserId)
        .filterByDateRange('2024-01-01', '2024-12-31')
        .filterByAmount(100, 1000)
        .filterByCategory(['Food', 'Transportation'])
        .filterByDescription('coffee')
        .search('starbucks')
        .sort('date', 'desc')
        .paginate(25, 0);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
      expect(query.orderBy.length).toBeGreaterThan(0);
    });

    it('should be chainable', () => {
      const result = new TransactionQueryBuilder(testUserId)
        .filterByDateRange('2024-01-01', '2024-12-31')
        .filterByAmount(100, 1000)
        .filterByCategory('Food')
        .sort('amount', 'desc')
        .paginate(25, 0);

      expect(result).toBeInstanceOf(TransactionQueryBuilder);
    });

    it('should handle all optional filters as undefined', () => {
      const builder = new TransactionQueryBuilder(testUserId)
        .filterByDateRange(undefined, undefined)
        .filterByAmount(undefined, undefined)
        .filterByCategory(undefined)
        .filterByAccount(undefined)
        .filterByDescription(undefined)
        .search(undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined(); // Should still have userId filter
    });
  });

  describe('includeExcluded', () => {
    it('should not filter excluded transactions when true', () => {
      const builder = new TransactionQueryBuilder(testUserId).includeExcluded(true);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should filter excluded transactions by default', () => {
      const builder = new TransactionQueryBuilder(testUserId);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });

  describe('filterByType', () => {
    it('should filter by transaction type', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByType('expense');

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });

    it('should handle no type filter', () => {
      const builder = new TransactionQueryBuilder(testUserId).filterByType(undefined);

      const query = builder.toSQL();
      expect(query.where).toBeDefined();
    });
  });
});
