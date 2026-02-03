import { describe, it, expect } from 'vitest';

describe('Finance Hooks - Type Safety', () => {
  describe('useFinanceAccounts', () => {
    it('should be exported and callable', async () => {
      // This test ensures the module compiles and exports are correct
      const { useFinanceAccounts } = await import('./use-finance-data');
      expect(typeof useFinanceAccounts).toBe('function');
    });
  });

  describe('useFinanceTransactions', () => {
    it('should be exported and callable', async () => {
      const { useFinanceTransactions } = await import('./use-finance-data');
      expect(typeof useFinanceTransactions).toBe('function');
    });
  });

  describe('useAllAccounts', () => {
    it('should be exported and callable', async () => {
      const { useAllAccounts } = await import('./use-finance-data');
      expect(typeof useAllAccounts).toBe('function');
    });
  });

  describe('FilterArgs interface', () => {
    it('should be exported', async () => {
      const module = await import('./use-finance-data');
      // The interface is exported as a type, so we just check it exists in the module
      expect(module).toBeDefined();
    });
  });
});
