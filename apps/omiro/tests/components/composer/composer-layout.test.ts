import { describe, expect, it } from 'vitest';

import { componentSizes, lineHeights } from '~/components/theme';

const MAX_INPUT_HEIGHT = lineHeights.body * 5;

function getComposerInputHeight(contentHeight: number) {
  return Math.min(MAX_INPUT_HEIGHT, Math.max(lineHeights.body, contentHeight));
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
});
