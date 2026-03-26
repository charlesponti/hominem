import { describe, expect, it } from 'vitest';

import { notesTokens } from './notes';
import { spacing } from './spacing';

describe('notesTokens.stream', () => {
  it('uses grouped airy list semantics', () => {
    expect(notesTokens.stream.itemGap).toBe(0);
    expect(notesTokens.stream.itemRadius).toBe(16);
    expect(notesTokens.stream.typeIconSize).toBe(6);
    expect(notesTokens.surfaces.page).not.toBe(notesTokens.surfaces.panel);
    expect(notesTokens.radii.panel).toBeGreaterThan(8);
    expect(notesTokens.stream.itemPaddingX).toBe(spacing[4]);
    expect(notesTokens.stream.itemPaddingY).toBe(spacing[3]);
    expect(notesTokens.stream.dividerInset).toBe(14);
    expect(notesTokens.states.previewOpacity).toBeLessThan(1);
    expect(notesTokens.spacing.noteContentGap).toBeLessThan(notesTokens.spacing.noteSecondaryGap);
  });
});
