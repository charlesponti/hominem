import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock sharp so tests don't require native binary
vi.mock('sharp', () => ({
  default: () => ({
    resize: ({ width, height }: { width: number; height: number }) => ({
      webp: ({ quality }: { quality: number }) => ({
        toBuffer: async () => Buffer.from(`${width}x${height}-${quality}`),
      }),
    }),
  }),
}))

import type { StoredFile } from '@hominem/utils/supabase'
import { placeImagesStorageService } from '@hominem/utils/supabase'
import { savePlacePhoto } from './place-images.service'

describe('savePlacePhoto', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads full and thumb with deterministic filenames', async () => {
    const googleMapsId = 'g123'
    const buffer = Buffer.from('test-buffer')
    const baseFullFilename = `${googleMapsId}-0-full`
    const baseThumbFilename = `${googleMapsId}-0-thumb`
    const fullFilename = `${baseFullFilename}.webp`
    const thumbFilename = `${baseThumbFilename}.webp`
    const fullUrl = 'https://cdn/full.webp'
    const thumbUrl = 'https://cdn/thumb.webp'

    const storeSpy = vi
      .spyOn(placeImagesStorageService, 'storeFile')
      .mockResolvedValueOnce({
        id: 'mock-id-1',
        originalName: baseFullFilename,
        filename: `places/${googleMapsId}/${fullFilename}`,
        mimetype: 'image/webp',
        size: Buffer.from(fullFilename).length,
        url: fullUrl,
        uploadedAt: new Date(),
      } as StoredFile)
      .mockResolvedValueOnce({
        id: 'mock-id-2',
        originalName: baseThumbFilename,
        filename: `places/${googleMapsId}/${thumbFilename}`,
        mimetype: 'image/webp',
        size: Buffer.from(thumbFilename).length,
        url: thumbUrl,
        uploadedAt: new Date(),
      } as StoredFile)

    const res = await savePlacePhoto(googleMapsId, buffer, 0)

    expect(storeSpy).toHaveBeenCalledTimes(2)

    const firstCall = storeSpy.mock.calls[0]
    const secondCall = storeSpy.mock.calls[1]

    // First call = full image
    expect(firstCall?.[1]).toBe('image/webp')
    expect(firstCall?.[2]).toBe(`places/${googleMapsId}`)
    expect(firstCall?.[3]).toEqual({ filename: baseFullFilename })

    // Second call = thumbnail
    expect(secondCall?.[1]).toBe('image/webp')
    expect(secondCall?.[3]).toEqual({ filename: baseThumbFilename })

    expect(res.fullUrl).toBe(fullUrl)
    expect(res.thumbUrl).toBe(thumbUrl)
    expect(res.fullFilename).toBe(fullFilename)
    expect(res.thumbFilename).toBe(thumbFilename)
  })

  it('continues when thumbnail upload fails', async () => {
    const googleMapsId = 'g456'
    const buffer = Buffer.from('test-buffer-2')
    const baseFullFilename = `${googleMapsId}-0-full`
    const fullFilename = `${baseFullFilename}.webp`

    const storeSpy = vi
      .spyOn(placeImagesStorageService, 'storeFile')
      .mockResolvedValueOnce({
        id: 'mock-id-3',
        originalName: baseFullFilename,
        filename: `places/${googleMapsId}/${fullFilename}`,
        mimetype: 'image/webp',
        size: Buffer.from(fullFilename).length,
        url: 'https://cdn/full2.webp',
        uploadedAt: new Date(),
      } as StoredFile)
      .mockRejectedValueOnce(new Error('upload fail'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await savePlacePhoto(googleMapsId, buffer, 0)

    expect(storeSpy).toHaveBeenCalledTimes(2)
    expect(res.fullUrl).toBe('https://cdn/full2.webp')
    expect(res.thumbUrl).toBeNull()

    consoleSpy.mockRestore()
  })
})
