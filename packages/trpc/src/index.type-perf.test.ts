import { attest } from '@ark/attest';

import type {
  AppRouter,
  AppRouterInputs,
  AppRouterOutputs,
  FinanceRouterInputs,
  FinanceRouterOutputs,
  NotesRouterInputs,
  NotesRouterOutputs,
  ChatsRouterInputs,
  ChatsRouterOutputs,
  EventsRouterInputs,
  EventsRouterOutputs,
  ContentRouterInputs,
  ContentRouterOutputs,
  TwitterRouterInputs,
  TwitterRouterOutputs,
} from './index';

/**
 * Type Performance Tests for Main App Router
 *
 * These tests verify that:
 * 1. Full app router inference is expensive (as expected)
 * 2. Per-feature router types are much cheaper
 * 3. Developers should use per-feature types in application code
 *
 * Performance Target: Per-feature types should be 80%+ faster than full app types
 */

describe('App Router Type Performance', () => {
  it('should track app router base type', () => {
    attest(() => {
      type Test = AppRouter;
    }).type.instantiations.lessThan(2000);
  });

  it('should show that full AppRouterInputs is expensive (baseline)', () => {
    attest(() => {
      type Test = AppRouterInputs;
    }).type.instantiations.lessThan(10000); // This is expensive!
  });

  it('should show that full AppRouterOutputs is expensive (baseline)', () => {
    attest(() => {
      type Test = AppRouterOutputs;
    }).type.instantiations.lessThan(10000); // This is expensive!
  });
});

describe('Optimized Per-Feature Router Types', () => {
  it('should efficiently infer FinanceRouterInputs', () => {
    attest(() => {
      type Test = FinanceRouterInputs;
    }).type.instantiations.lessThan(2000); // 80% better than full app
  });

  it('should efficiently infer FinanceRouterOutputs', () => {
    attest(() => {
      type Test = FinanceRouterOutputs;
    }).type.instantiations.lessThan(2000); // 80% better than full app
  });

  it('should efficiently infer NotesRouterInputs', () => {
    attest(() => {
      type Test = NotesRouterInputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer NotesRouterOutputs', () => {
    attest(() => {
      type Test = NotesRouterOutputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer ChatsRouterInputs', () => {
    attest(() => {
      type Test = ChatsRouterInputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer ChatsRouterOutputs', () => {
    attest(() => {
      type Test = ChatsRouterOutputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer EventsRouterInputs', () => {
    attest(() => {
      type Test = EventsRouterInputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer EventsRouterOutputs', () => {
    attest(() => {
      type Test = EventsRouterOutputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer ContentRouterInputs', () => {
    attest(() => {
      type Test = ContentRouterInputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer ContentRouterOutputs', () => {
    attest(() => {
      type Test = ContentRouterOutputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer TwitterRouterInputs', () => {
    attest(() => {
      type Test = TwitterRouterInputs;
    }).type.instantiations.lessThan(1500);
  });

  it('should efficiently infer TwitterRouterOutputs', () => {
    attest(() => {
      type Test = TwitterRouterOutputs;
    }).type.instantiations.lessThan(1500);
  });
});

describe('Multiple Feature Types Combined', () => {
  it('should efficiently use 2 feature routers together', () => {
    attest(() => {
      type Combined = {
        finance: FinanceRouterInputs;
        notes: NotesRouterInputs;
      };
      type Test = Combined;
    }).type.instantiations.lessThan(3500); // Still better than full app
  });

  it('should efficiently use 3 feature routers together', () => {
    attest(() => {
      type Combined = {
        finance: FinanceRouterOutputs;
        notes: NotesRouterOutputs;
        chats: ChatsRouterOutputs;
      };
      type Test = Combined;
    }).type.instantiations.lessThan(5000); // Still better than full app
  });
});

describe('Real-World Usage Patterns', () => {
  it('should handle typical app component type usage', () => {
    attest(() => {
      // Simulates using types in a component that needs finance and notes
      type FinanceData = {
        transactions: FinanceRouterOutputs['transactions'];
        accounts: FinanceRouterOutputs['accounts'];
      };
      type NotesData = {
        list: NotesRouterOutputs['list'];
        tags: NotesRouterOutputs['tags'];
      };
      type ComponentProps = {
        finance: FinanceData;
        notes: NotesData;
      };
      type Test = ComponentProps;
    }).type.instantiations.lessThan(3000);
  });
});
