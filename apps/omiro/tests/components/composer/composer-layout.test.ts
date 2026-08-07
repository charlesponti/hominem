import { describe, expect, it } from 'vitest';

const LINE_HEIGHT_BODY = 22;
const TOUCH_TARGET_XL = 44;
const MAX_INPUT_HEIGHT = LINE_HEIGHT_BODY * 5;

function getComposerInputHeight(contentHeight: number) {
  return Math.min(MAX_INPUT_HEIGHT, Math.max(LINE_HEIGHT_BODY, contentHeight));
}

describe('composer geometry', () => {
  it('uses a 22pt line height and 44pt touch target', () => {
    expect(LINE_HEIGHT_BODY).toBe(22);
    expect(TOUCH_TARGET_XL).toBe(44);
  });

  it('caps text growth at five lines', () => {
    expect(MAX_INPUT_HEIGHT).toBe(LINE_HEIGHT_BODY * 5);
    expect(getComposerInputHeight(1_000)).toBe(MAX_INPUT_HEIGHT);
  });
});
