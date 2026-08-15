// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterAll, describe, expect, it } from 'vitest';

// The store's `scenarios` array is built once at module-evaluation time,
// gated on `__DEV__` (tests/setup.ts sets it to `false` globally). Flip it
// before importing the module so the real fixture-building branch runs —
// otherwise `scenarios` is permanently `[]` for this module instance.
const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });

afterAll(() => {
  Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: originalDev });
});

const { useTimePreview, setTimePreviewScenario } =
  await import('~/components/time/time-preview-store');

describe('useTimePreview', () => {
  it('exposes the dev-only fixture scenarios and starts with no scenario selected', () => {
    const { result } = renderHook(() => useTimePreview());

    expect(result.current.scenario).toBeNull();
    expect(result.current.scenarios.length).toBeGreaterThan(0);
  });

  it('selects a scenario by id and notifies subscribers', () => {
    const { result } = renderHook(() => useTimePreview());
    const targetId = result.current.scenarios[0]?.id;
    expect(targetId).toBeDefined();

    act(() => {
      result.current.setScenarioId(targetId ?? null);
    });

    expect(result.current.scenario?.id).toBe(targetId);
  });

  it('clears the scenario when given an id that does not match any scenario', () => {
    const { result } = renderHook(() => useTimePreview());
    const targetId = result.current.scenarios[0]?.id;

    act(() => {
      setTimePreviewScenario(targetId ?? null);
    });
    expect(result.current.scenario?.id).toBe(targetId);

    act(() => {
      setTimePreviewScenario('not-a-real-scenario');
    });

    expect(result.current.scenario).toBeNull();
  });

  it('is a no-op when selecting the already-active scenario', () => {
    const { result } = renderHook(() => useTimePreview());
    const targetId = result.current.scenarios[0]?.id;

    act(() => {
      setTimePreviewScenario(targetId ?? null);
    });
    const scenarioBefore = result.current.scenario;

    act(() => {
      setTimePreviewScenario(targetId ?? null);
    });

    expect(result.current.scenario).toBe(scenarioBefore);
  });
});
