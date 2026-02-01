import { describe, expect, it } from 'vitest';

import { buildPhotoMediaUrl, isValidGoogleHost } from './google';

describe('google utils', () => {
  describe('isValidGoogleHost', () => {
    it('should return true for googleapis.com', () => {
      expect(isValidGoogleHost('https://places.googleapis.com/v1/places/123')).toBe(true);
    });

    it('should return true for googleusercontent.com', () => {
      expect(isValidGoogleHost('https://lh3.googleusercontent.com/p/abc=s1600')).toBe(true);
    });

    it('should return true for subdomains of allowed domains', () => {
      expect(isValidGoogleHost('https://sub.googleapis.com')).toBe(true);
      expect(isValidGoogleHost('https://test.googleusercontent.com')).toBe(true);
    });

    it('should return false for other domains', () => {
      expect(isValidGoogleHost('https://example.com')).toBe(false);
      expect(isValidGoogleHost('https://google.com')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidGoogleHost('not-a-url')).toBe(false);
    });
  });

  describe('buildPhotoMediaUrl', () => {
    it('should include api key and sizing params', () => {
      const url = buildPhotoMediaUrl({
        key: 'test-key',
        pathname: 'places/foo/photos/1',
        maxWidthPx: 800,
        maxHeightPx: 600,
      });

      expect(url).toContain('places/foo/photos/1/media');
      expect(url).toContain('maxWidthPx=800');
      expect(url).toContain('maxHeightPx=600');
      expect(url).toContain('key=test-key');
    });

    it('should use default sizing params if not provided', () => {
      const url = buildPhotoMediaUrl({
        key: 'test-key',
        pathname: 'places/foo/photos/1',
      });

      expect(url).toContain('maxWidthPx=600');
      expect(url).toContain('maxHeightPx=400');
    });
  });
});
