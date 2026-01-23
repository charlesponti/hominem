import { attest } from '@ark/attest';

/**
 * Root-level Type Performance Tests
 *
 * This file demonstrates how to use @ark/attest to find and prevent
 * TypeScript performance issues in your monorepo.
 *
 * Key Metrics:
 * - Type Instantiations: The number of times TypeScript instantiates generic types
 *   - Lower is better (typically aim for <1000 for simple types, <5000 for complex)
 * - Completions: The number of autocomplete suggestions generated
 *   - High numbers can slow down IDE experience
 *
 * Common Performance Issues:
 * 1. Deeply nested generic types (e.g., conditional types within conditionals)
 * 2. Large union types (50+ members)
 * 3. Complex mapped types over large objects
 * 4. Recursive types without proper bounds
 * 5. Excessive use of utility types (Pick, Omit, etc.) on large types
 *
 * How to Use:
 * 1. Run tests: `bun test type-performance.test.ts`
 * 2. Initial run creates snapshots in `.attest/` directory
 * 3. Subsequent runs compare against snapshots
 * 4. Update snapshots: `bun test type-performance.test.ts --update-snapshots`
 *
 * When to Add Tests:
 * - Complex types that are widely used across the codebase
 * - Router types that affect API client generation
 * - Schema types used in database queries
 * - Utility types that combine multiple transformations
 * - After noticing IDE slowdowns during development
 */

describe('Example Type Performance Tests', () => {
  it('should track simple type instantiations', () => {
    attest(() => {
      type SimpleType = { id: string; name: string };
      type Test = SimpleType;
    }).type.instantiations.snap();
    // On first run, this creates a snapshot
    // On subsequent runs, it fails if instantiations change significantly
  });

  it('should track complex utility type usage', () => {
    attest(() => {
      type Base = {
        id: string;
        name: string;
        email: string;
        age: number;
        address: {
          street: string;
          city: string;
          country: string;
        };
      };
      type PartialUpdate = Partial<Omit<Base, 'id'>>;
      type Test = PartialUpdate;
    }).type.instantiations.snap();
  });

  it('should detect expensive type operations', () => {
    attest(() => {
      // Example of a type that could be expensive
      type BigUnion = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';
      type MappedType = {
        [K in BigUnion]: {
          type: K;
          value: string;
          metadata: Record<string, unknown>;
        };
      };
      type Test = MappedType;
    }).type.instantiations.lessThan(500);
  });

  it('should track array and nested types', () => {
    attest(() => {
      type Item = {
        id: string;
        children: Item[];
      };
      type List = Item[];
      type Test = List;
    }).type.instantiations.snap();
  });

  it('should benchmark generic type inference', () => {
    attest(() => {
      type GenericWrapper<T> = {
        data: T;
        meta: {
          timestamp: Date;
          version: number;
        };
      };
      type ComplexData = {
        users: Array<{ id: string; name: string }>;
        settings: Record<string, unknown>;
      };
      type Test = GenericWrapper<ComplexData>;
    }).type.instantiations.snap();
  });
});

/**
 * Finding Performance Issues in Your Monorepo:
 *
 * 1. Start with slow modules:
 *    - Identify files where IDE is slow or TypeScript takes long to check
 *    - Add type performance tests for types in those files
 *
 * 2. Test complex intersections:
 *    - Types that combine multiple interfaces or mapped types
 *    - Router types that use deep inference
 *    - Schema types with many relations
 *
 * 3. Measure before and after:
 *    - Add test before refactoring
 *    - Refactor to simpler types
 *    - Compare instantiation counts
 *
 * 4. Set thresholds:
 *    - Use .lessThan(n) for critical types
 *    - Use .snap() to catch regressions
 *
 * 5. Common fixes:
 *    - Extract complex types into named interfaces
 *    - Use type aliases instead of inline types
 *    - Avoid deeply nested Pick/Omit chains
 *    - Simplify union types
 *    - Add explicit type annotations to break inference chains
 */
