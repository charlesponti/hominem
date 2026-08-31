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
      // it's a type export, so there's nothing to check at runtime besides the module loading
      expect(useFinanceData).toBeDefined();
    });
  });
});
