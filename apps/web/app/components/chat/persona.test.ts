// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const runtimeLoader = vi.hoisted(() => ({
  awaitInstance: vi.fn().mockResolvedValue({}),
  setWasmFallbackUrl: vi.fn(),
  setWasmUrl: vi.fn(),
}));

vi.mock('@rive-app/webgl2', () => ({ RuntimeLoader: runtimeLoader }));
vi.mock('@rive-app/react-webgl2', () => ({
  useRive: () => ({ RiveComponent: () => null, rive: null }),
  useStateMachineInput: () => null,
}));

import { preloadPersona } from './persona';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preloadPersona', () => {
  it('warms the local Rive runtime and Mana asset once', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await preloadPersona();
    await preloadPersona();

    expect(runtimeLoader.setWasmUrl).toHaveBeenCalledWith('/rive/rive-webgl2-2.40.1.wasm');
    expect(runtimeLoader.setWasmFallbackUrl).toHaveBeenCalledWith(null);
    expect(runtimeLoader.awaitInstance).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/rive/mana-2.0.riv', { cache: 'force-cache' });
  });
});
