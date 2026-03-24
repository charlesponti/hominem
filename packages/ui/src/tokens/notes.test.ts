import { describe, expect, it } from 'vitest';

import { notesTokens } from './notes';
import { spacing } from './spacing';

describe('notesTokens.stream', () => {
  it('uses grouped airy list semantics', () => {
    expect(notesTokens.stream.itemGap).toBe(0);
    expect(notesTokens.stream.itemRadius).toBe(0);
    expect(notesTokens.stream.typeIconSize).toBe(14);
    expect(notesTokens.surfaces.page).not.toBe(notesTokens.surfaces.panel);
    expect(notesTokens.radii.panel).toBeGreaterThan(8);
    expect(notesTokens.spacing.feedItemPaddingX).toBe(spacing[5]);
    expect(notesTokens.spacing.feedItemPaddingY).toBe(spacing[4]);
    expect(notesTokens.spacing.noteContentGap).toBeLessThan(notesTokens.spacing.noteSecondaryGap);
  });
});
