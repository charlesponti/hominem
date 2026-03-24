import { describe, expect, it, vi } from 'vitest'

import {
  performMobileUploads,
  resolveMobileUploadMimeType,
  type MobileUploadAsset,
} from '../../utils/services/files/use-file-upload'

describe('mobile file upload helper', () => {
  it('derives a mime type from file extension when the picker does not provide one', () => {
    expect(resolveMobileUploadMimeType({
      assetId: 'asset-1',
      fileName: 'receipt.png',
      mimeType: null,
      type: 'image',
      uri: 'file:///tmp/receipt.png',
    })).toBe('image/png')
  })

  it('uploads through prepare-upload, signed PUT, and complete-upload', async () => {
    const prepareUpload = vi.fn(async () => ({
      fileId: 'file-1',
      key: 'user/file-1-receipt.png',
      originalName: 'receipt.png',
      mimetype: 'image/png',
      size: 4,
      uploadUrl: 'https://uploads.example.com/signed-put',
      headers: {
        'Content-Type': 'image/png',
      },
    }))
    const completeUpload = vi.fn(async () => ({
      file: {
        id: 'file-1',
        originalName: 'receipt.png',
        type: 'image' as const,
        mimetype: 'image/png',
        size: 4,
        url: 'https://cdn.example.com/receipt.png',
        uploadedAt: '2026-01-01T00:00:00.000Z',
      },
    }))
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === 'file:///tmp/receipt.png') {
        return new Response(new Blob(['data'], { type: 'image/png' }))
      }

      if (url === 'https://uploads.example.com/signed-put') {
        expect(init?.method).toBe('PUT')
        expect(init?.headers).toEqual({
          'Content-Type': 'image/png',
        })
        return new Response(null, { status: 200 })
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    }) as typeof fetch

    const asset: MobileUploadAsset = {
      assetId: 'asset-1',
      fileName: 'receipt.png',
      mimeType: null,
      type: 'image',
      uri: 'file:///tmp/receipt.png',
    }

    const result = await performMobileUploads(
      {
        prepareUpload,
        completeUpload,
      },
      [asset],
      { fetchImpl },
    )

    expect(result.errors).toEqual([])
    expect(result.uploaded).toHaveLength(1)
    expect(result.uploaded[0]).toMatchObject({
      assetId: 'asset-1',
      localUri: 'file:///tmp/receipt.png',
      uploadedFile: {
        id: 'file-1',
        originalName: 'receipt.png',
        mimetype: 'image/png',
        url: 'https://cdn.example.com/receipt.png',
      },
    })
    expect(result.uploaded[0]?.uploadedFile.uploadedAt).toBeInstanceOf(Date)
    expect(prepareUpload).toHaveBeenCalledWith({
      originalName: 'receipt.png',
      mimetype: 'image/png',
      size: 4,
    })
    expect(completeUpload).toHaveBeenCalledWith({
      fileId: 'file-1',
      key: 'user/file-1-receipt.png',
      originalName: 'receipt.png',
      mimetype: 'image/png',
      size: 4,
    })
  })

  it('collects errors for unsupported file types without aborting the batch', async () => {
    const result = await performMobileUploads(
      {
        prepareUpload: vi.fn(),
        completeUpload: vi.fn(),
      },
      [
        {
          assetId: 'asset-1',
          fileName: 'script.exe',
          mimeType: 'application/x-msdownload',
          type: 'document',
          uri: 'file:///tmp/script.exe',
        },
      ],
      {
        fetchImpl: vi.fn() as typeof fetch,
      },
    )

    expect(result.uploaded).toEqual([])
    expect(result.errors).toEqual(['script.exe: Unsupported file type'])
  })
})