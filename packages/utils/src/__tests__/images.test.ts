import { describe, expect, it } from 'vitest';

import { buildPhotoMediaUrl } from '../google.js';
import {
  getHominemPhotoURL,
  isGooglePlacesPhotoReference,
  normalizePhotoReference,
  sanitizeStoredPhotos,
} from '../images.js';

describe('buildPhotoMediaUrl', () => {
  it('builds a Google Places media URL with correct query params', () => {
    const url = buildPhotoMediaUrl({
      key: 'test-key',
      pathname: 'places/abc/photos/1',
      maxWidthPx: 1600,
      maxHeightPx: 1200,
    });

    expect(url.startsWith('https://places.googleapis.com/v1/places/abc/photos/1/media')).toBe(true);
    expect(url).toContain('maxWidthPx=1600');
    expect(url).toContain('maxHeightPx=1200');
    expect(url).toContain('key=test-key');
  });
});

describe('getHominemPhotoURL', () => {
  it('returns null for empty input', () => {
    expect(getHominemPhotoURL('', 800, 600)).toBeNull();
  });

  it('returns thumb variant for small supabase requests and unchanged for larger', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/places/abc.jpg';
    const thumbUrl = 'https://xyz.supabase.co/storage/v1/object/public/places/abc-thumb.jpg';
    // Small request should return thumb
    expect(getHominemPhotoURL(url, 800, 600)).toBe(thumbUrl);
    // Larger request should return as-is
    expect(getHominemPhotoURL(url, 1600, 1200)).toBe(url);
  });

  it('builds proxy URL for Google Places reference', () => {
    const ref = 'places/ChIJ.../photos/abcd';
    const out = getHominemPhotoURL(ref, 640, 480);
    expect(out).toBe(`/api/images?resource=${encodeURIComponent(ref)}&width=640&height=480`);
  });

  it('appends dimensions to googleusercontent URLs', () => {
    const url = 'https://lh3.googleusercontent.com/abc';
    expect(getHominemPhotoURL(url, 320, 200)).toBe(`${url}=w320-h200-c`);
  });

  it('does not proxy malformed place references', () => {
    // reversed order or malformed should not be proxied
    expect(getHominemPhotoURL('photos/places/abc', 640, 480)).toBeNull();
    expect(getHominemPhotoURL('places//photos/1', 640, 480)).toBeNull();
  });
});

describe('isGooglePlacesPhotoReference', () => {
  it('recognizes valid references', () => {
    expect(isGooglePlacesPhotoReference('places/abc/photos/1')).toBe(true);
    expect(isGooglePlacesPhotoReference('places/abc/photos/1?foo=bar')).toBe(true);
  });

  it('rejects invalid or malformed references', () => {
    expect(isGooglePlacesPhotoReference('photos/places/abc')).toBe(false);
    expect(isGooglePlacesPhotoReference('places//photos/1')).toBe(false);
    expect(isGooglePlacesPhotoReference('places/abc/photos/')).toBe(false);
    expect(isGooglePlacesPhotoReference('foo/places/photos/bar')).toBe(false);
  });
});

describe('normalizePhotoReference', () => {
  it('extracts resource from proxy URL', () => {
    const ref = 'places/abc/photos/1';
    const proxy = `/api/images?resource=${encodeURIComponent(ref)}&width=1600`;
    expect(normalizePhotoReference(proxy)).toBe(ref);
  });

  it('returns original if not a proxy URL', () => {
    const ref = 'https://example.com/image.jpg';
    expect(normalizePhotoReference(ref)).toBe(ref);
    expect(normalizePhotoReference('places/abc/photos/1')).toBe('places/abc/photos/1');
  });
});

describe('sanitizeStoredPhotos', () => {
  it('should return empty array if input is not an array', () => {
    expect(sanitizeStoredPhotos(null)).toEqual([]);
    expect(sanitizeStoredPhotos(undefined)).toEqual([]);
  });

  it('should filter out non-string or empty string values', () => {
    const photos = ['photo1', '', 'photo2', '  '];
    expect(sanitizeStoredPhotos(photos)).toEqual(['photo1', 'photo2']);
  });

  it('should deduplicate photo references', () => {
    const photos = ['photo1', 'photo1', 'photo2'];
    expect(sanitizeStoredPhotos(photos)).toEqual(['photo1', 'photo2']);
  });

  it('should normalize and deduplicate mixed proxy and raw references', () => {
    const ref = 'places/abc/photos/1';
    const proxy = `/api/images?resource=${encodeURIComponent(ref)}&width=1600`;
    const photos = [ref, proxy, 'photo2'];
    expect(sanitizeStoredPhotos(photos)).toEqual([ref, 'photo2']);
  });
});
