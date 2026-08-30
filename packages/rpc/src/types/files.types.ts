import type { InferResponseType } from 'hono/client';

import type { HonoClient } from '../core/api-client';

type UploadRoute = HonoClient['api']['files']['$post'];

export type UploadResponse = InferResponseType<UploadRoute, 200>;
export type UploadedFileDto = UploadResponse['file'];

// ============================================================================
// Client-normalized file types
// ============================================================================
// Deliberately separate from UploadedFileDto above: that's the raw RPC wire
// shape, this is what apps/web and apps/omiro each map it into via their own
// toUploadedFile() (dates parsed, etc.) before rendering. Shared here because
// both apps needed the identical shape, not because it should track the wire
// type -- if the two ever need to diverge, split them back apart.

/**
 * Processed file from server-side file processing
 */
export interface ProcessedFile {
  id: string;
  originalName: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  mimetype: string;
  size: number;
  content?: string;
  textContent?: string;
  metadata?: Record<string, unknown>;
  thumbnail?: string;
  duration?: number;
  transcription?: string;
}

/**
 * Successfully uploaded file, normalized for client-side use
 */
export interface UploadedFile extends ProcessedFile {
  url: string;
  uploadedAt: Date;
  vectorIds?: string[];
}
