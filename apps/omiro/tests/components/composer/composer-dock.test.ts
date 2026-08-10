import { describe, expect, it } from 'vitest';

import { getFloatingDockInset } from '~/components/composer/composerDock.helpers';

describe('floating composer inset', () => {
  it('reserves the dock height while the keyboard is hidden', () => {
    expect(getFloatingDockInset({ dockHeight: 96, keyboardHeight: 0, safeAreaBottom: 34 })).toBe(
      96,
    );
  });

  it('reserves the keyboard space above the safe area while the dock is lifted', () => {
    expect(getFloatingDockInset({ dockHeight: 96, keyboardHeight: 336, safeAreaBottom: 34 })).toBe(
      398,
    );
  });

  it('does not subtract more than the keyboard occupies', () => {
    expect(getFloatingDockInset({ dockHeight: 96, keyboardHeight: 20, safeAreaBottom: 34 })).toBe(
      96,
    );
  });
});
