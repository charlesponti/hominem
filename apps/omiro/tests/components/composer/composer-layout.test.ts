import { describe, expect, it } from 'vitest';

import { componentSizes, lineHeights, spacing } from '~/components/theme';

const COLLAPSED_HEIGHT = lineHeights.body + componentSizes.xl;
const MAX_INPUT_HEIGHT = lineHeights.body * 5;

function getComposerInputHeight(contentHeight: number) {
  return Math.min(MAX_INPUT_HEIGHT, Math.max(lineHeights.body, contentHeight));
}

function getCollapsedComposerDockHeight(bottomInset: number) {
  return COLLAPSED_HEIGHT + bottomInset;
}

describe('composer geometry', () => {
  it('uses a 22pt line height and 44pt touch target', () => {
    expect(lineHeights.body).toBe(22);
    expect(componentSizes.xl).toBe(44);
  });

  it('caps text growth at five lines', () => {
    expect(MAX_INPUT_HEIGHT).toBe(lineHeights.body * 5);
    expect(getComposerInputHeight(1_000)).toBe(MAX_INPUT_HEIGHT);
  });

  it('includes the safe area in measured list clearance', () => {
    expect(getCollapsedComposerDockHeight(34)).toBe(COLLAPSED_HEIGHT + 34);
  });
});
