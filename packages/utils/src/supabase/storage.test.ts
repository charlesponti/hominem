import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupabaseStorageService } from './storage';

describe('SupabaseStorageService.storeFile filename option', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses provided filename (sanitized) under the userId directory', async () => {
    const uploadMock = vi
      .fn()
      .mockResolvedValue({ data: { path: 'places/g789/g789-0-full.webp' }, error: null });
    const getPublicUrlMock = vi
      .fn()
      .mockReturnValue({ data: { publicUrl: 'https://cdn/g789-0-full.webp' } });
    const listBucketsMock = vi.fn().mockResolvedValue({ data: [] });
    const createBucketMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const fakeClient = {
      storage: {
        listBuckets: listBucketsMock,
        createBucket: createBucketMock,
        from: () => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        }),
      },
    };

    const svc = new SupabaseStorageService('test-bucket', { isPublic: true });
    // inject the fake client
    svc.client = fakeClient;

    const buffer = Buffer.from('x');
    const res = await svc.storeFile(buffer, 'image/webp', 'places/g789', {
      filename: 'g789-0-full.webp',
    });

    // upload should be called with full path: userId / provided filename
    expect(uploadMock).toHaveBeenCalled();
    const calledPath = uploadMock.mock.calls[0]?.[0];
    expect(calledPath).toBe('places/g789/g789-0-full.webp');

    // returned filename should match storage path
    expect(res.filename).toBe('places/g789/g789-0-full.webp');
    expect(res.url).toBe('https://cdn/g789-0-full.webp');
  });
});
