import { describe, expect, it, vi } from 'vitest';
import { preparePlaceInsertData } from './places.service';
import type { PlaceInsert } from '../db/schema';

// Mock crypto for deterministic results if needed, though randomUUID is fine for now
// Mock drizzle-orm and db to avoid actual DB connection
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('../db/schema', () => ({
  place: {},
  item: {},
  list: {},
}));

describe('preparePlaceInsertData', () => {
  it('should normalize imageUrl and photos', async () => {
    const rawRef = 'places/123/photos/abc';
    const proxyUrl = `/api/images?resource=${encodeURIComponent(rawRef)}&width=1600`;

    const input: PlaceInsert = {
      googleMapsId: 'g123',
      name: 'Test Place',
      photos: [proxyUrl, 'raw-ref-2'],
      imageUrl: proxyUrl,
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toEqual([rawRef, 'raw-ref-2']);
    expect(result.imageUrl).toBe(rawRef);
    expect(result.googleMapsId).toBe('g123');
    expect(result.name).toBe('Test Place');
  });

  it('should handle missing photos and imageUrl', async () => {
    const input: PlaceInsert = {
      googleMapsId: 'g456',
      name: 'Minimal Place',
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it('should fallback to first photo for imageUrl if not provided', async () => {
    const input: PlaceInsert = {
      googleMapsId: 'g789',
      name: 'Photo Place',
      photos: ['photo1', 'photo2'],
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toEqual(['photo1', 'photo2']);
    expect(result.imageUrl).toBe('photo1');
  });
});
