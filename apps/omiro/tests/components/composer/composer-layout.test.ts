import { describe, expect, it } from 'vitest';

import { componentSizes, lineHeights, spacing } from '~/components/theme';

const MAX_LINES = 5;
const TEXT_VERTICAL_PADDING = (componentSizes.xl - lineHeights.body) / 2;
const MAX_INPUT_HEIGHT = lineHeights.body * MAX_LINES + TEXT_VERTICAL_PADDING * 2;
const COLLAPSED_HEIGHT = componentSizes.xl * 2 + spacing[2] * 3;

function getComposerInputHeight(contentHeight: number) {
  return Math.min(MAX_INPUT_HEIGHT, Math.max(componentSizes.xl, contentHeight));
}

function getComposerDockHeight(contentHeight: number, bottomInset: number) {
  return contentHeight + bottomInset + spacing[2];
}

function getCollapsedComposerDockHeight(bottomInset: number) {
  return getComposerDockHeight(COLLAPSED_HEIGHT, bottomInset);
}

describe('composer geometry', () => {
  it('uses one 44pt icon-button target', () => {
    expect(componentSizes.xl).toBe(44);
  });

  it('centers one line at the icon-button height', () => {
    expect(getComposerInputHeight(lineHeights.body)).toBe(componentSizes.xl);
  });

  it('caps text growth at five lines', () => {
    expect(MAX_INPUT_HEIGHT).toBe(lineHeights.body * MAX_LINES + TEXT_VERTICAL_PADDING * 2);
    expect(getComposerInputHeight(1_000)).toBe(MAX_INPUT_HEIGHT);
  });

  it('includes extensions and the safe area in measured list clearance', () => {
    expect(getComposerDockHeight(180, 34)).toBe(222);
    expect(getCollapsedComposerDockHeight(34)).toBe(112 + 34 + 8);
  });
});
