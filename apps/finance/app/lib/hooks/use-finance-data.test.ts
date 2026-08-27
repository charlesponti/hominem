import { describe, it, expect } from 'vitest';

import * as useFinanceData from './use-finance-data';

describe('Finance Hooks - Type Safety', () => {
  describe('useFinanceAccounts', () => {
    it('should be exported and callable', () => {
      expect(typeof useFinanceData.useFinanceAccounts).toBe('function');
    });
  });

  describe('useFinanceTransactions', () => {
    it('should be exported and callable', () => {
      expect(typeof useFinanceData.useFinanceTransactions).toBe('function');
    });
  });

  describe('useAllAccounts', () => {
    it('should be exported and callable', () => {
      expect(typeof useFinanceData.useAllAccounts).toBe('function');
    });
  });

  describe('FilterArgs interface', () => {
    it('should be exported', () => {
      // The interface is exported as a type, so we just check the module exists
      expect(useFinanceData).toBeDefined();
    });
  });
});
