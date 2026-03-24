import { formatNoteAttachmentsSection, formatUploadedFileContext } from '@hominem/ui/composer';
import type { UploadedFile } from '@hominem/ui/types/upload';
import { describe, expect, it } from 'vitest';

function createUploadedFileFixture(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'upload-1',
    originalName: 'brief.pdf',
    type: 'document',
    mimetype: 'application/pdf',
    size: 512,
    content: 'Quarterly brief',
    url: 'https://example.test/brief.pdf',
    uploadedAt: new Date(),
    ...overrides,
  };
}

describe('composer attachments helpers', () => {
  it('formats uploaded file context for chat submission', () => {
    const context = formatUploadedFileContext([createUploadedFileFixture()]);

    expect(context).toContain('Attached files context:');
    expect(context).toContain('Attachment: brief.pdf');
    expect(context).toContain('Quarterly brief');
  });

  it('formats note attachment blocks for note content', () => {
    const content = formatNoteAttachmentsSection([createUploadedFileFixture()]);

    expect(content).toContain('## Attachments');
    expect(content).toContain('- [brief.pdf](https://example.test/brief.pdf)');
  });
});
