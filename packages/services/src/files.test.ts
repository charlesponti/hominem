import { describe, expect, it } from 'vitest';

import { FileProcessorService } from './files';

describe('FileProcessorService', () => {
  it('extracts raw text from a plain-text file without calling any AI', async () => {
    const file = await FileProcessorService.processFile(
      new TextEncoder().encode('hello world').buffer,
      'notes.txt',
      'text/plain',
      'file-id',
    );

    expect(file.type).toBe('document');
    expect(file.textContent).toBe('hello world');
    expect(file.content).toBe('hello world');
  });

  it('leaves images unanalyzed, since that requires an AI call outside this service', async () => {
    const file = await FileProcessorService.processFile(
      new TextEncoder().encode('tiny-image').buffer,
      'image.png',
      'image/png',
      'file-id',
    );

    expect(file.type).toBe('image');
    expect(file.textContent).toBeUndefined();
  });

  it('formats byte sizes', () => {
    expect(FileProcessorService.formatFileSize(0)).toBe('0 Bytes');
    expect(FileProcessorService.formatFileSize(1024)).toBe('1 KB');
  });

  it('reports supported file types', () => {
    expect(FileProcessorService.isSupportedFileType('application/pdf')).toBe(true);
    expect(FileProcessorService.isSupportedFileType('application/zip')).toBe(false);
  });
});
