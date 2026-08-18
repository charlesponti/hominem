import { describe, expect, it } from 'vitest';

import { getFloatingDockInset } from '~/components/composer/composerDock.helpers';

describe('floating composer inset', () => {
  it('reserves no extra space while the keyboard is hidden', () => {
    expect(getFloatingDockInset({ keyboardHeight: 0, safeAreaBottom: 34 })).toBe(0);
  });

  it('reserves the keyboard space above the safe area while the dock is lifted', () => {
    expect(getFloatingDockInset({ keyboardHeight: 336, safeAreaBottom: 34 })).toBe(302);
  });

  it('does not reserve space when the keyboard is shorter than the safe area', () => {
    expect(getFloatingDockInset({ keyboardHeight: 20, safeAreaBottom: 34 })).toBe(0);
  });
});
