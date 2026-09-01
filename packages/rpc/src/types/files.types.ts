import type { InferResponseType } from 'hono/client';

import type { HonoClient } from '../core/api-client';

type UploadRoute = HonoClient['api']['files']['$post'];

export type UploadResponse = InferResponseType<UploadRoute, 200>;
export type UploadedFileDto = UploadResponse['file'];

// ============================================================================
// Client-normalized file types
// ============================================================================
// kept separate from UploadedFileDto on purpose: that's the raw RPC wire shape,
// this is what apps/web and apps/omiro map it into via their own toUploadedFile()
// (parsed dates, etc.) before rendering. it's shared just because both apps happen
// to need the same shape right now -- if that stops being true, split them back apart

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

export interface UploadedFile extends ProcessedFile {
  url: string;
  uploadedAt: Date;
  vectorIds?: string[];
}
