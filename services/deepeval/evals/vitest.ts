import type { Golden } from 'deepeval/dataset';
import type { BaseConversationalMetric, BaseMetric } from 'deepeval/metrics';

type ToPassOptions = {
  task?: (golden: Golden) => unknown;
  golden?: Golden;
};

declare module 'vitest' {
  interface Assertion<T> {
    toPass(
      metrics?: Array<BaseMetric | BaseConversationalMetric>,
      options?: ToPassOptions,
    ): Promise<T>;
  }
}

declare module '@vitest/expect' {
  interface Assertion<T> {
    toPass(
      metrics?: Array<BaseMetric | BaseConversationalMetric>,
      options?: ToPassOptions,
    ): Promise<T>;
  }
}
