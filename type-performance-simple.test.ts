/**
 * Simple Type Performance Test Example
 *
 * This demonstrates a basic approach to tracking TypeScript performance
 * using @ark/attest without complex setup.
 *
 * Run with: bun test type-performance-simple.test.ts
 */

import { bench, type } from '@ark/attest';

describe('Simple Type Performance Benchmarking', () => {
  it('should measure simple type instantiations', () => {
    type SimpleType = { id: string; name: string };

    const result = type(() => {
      return {} as SimpleType;
    }).infer;

    // This will output instantiation counts in the console
    console.log('SimpleType result:', result);
  });

  it('should measure complex nested type', () => {
    type ComplexType = {
      user: {
        profile: {
          settings: {
            preferences: Record<string, unknown>;
          };
        };
      };
    };

    const result = type(() => {
      return {} as ComplexType;
    }).infer;

    console.log('ComplexType result:', result);
  });
});

/**
 * Benchmark example for comparing different type approaches
 */
describe('Type Performance Comparison', () => {
  it('should compare utility type chains', () => {
    type Base = {
      id: string;
      name: string;
      email: string;
      age: number;
      address: string;
    };

    // Approach 1: Chained utilities
    type Approach1 = Partial<Pick<Omit<Base, 'id'>, 'name' | 'email'>>;

    // Approach 2: Direct type definition
    type Approach2 = {
      name?: string;
      email?: string;
    };

    const result1 = type(() => {} as Approach1).infer;
    const result2 = type(() => {} as Approach2).infer;

    console.log('Chained utilities:', result1);
    console.log('Direct definition:', result2);
  });
});
