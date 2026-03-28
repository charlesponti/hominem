import { formatNoteAttachmentsSection, formatUploadedFileContext } from '@hominem/ui/composer';
import type { UploadedFile } from '@hominem/ui/types/upload';
import { describe, expect, it } from 'vitest';

function createUploadedFileFixture(overrides: Partial<UploadedFile> = {}): UploadedFile {
  const file: UploadedFile = {
    id: overrides.id ?? 'upload-1',
    originalName: overrides.originalName ?? 'brief.pdf',
    type: overrides.type ?? 'document',
    mimetype: overrides.mimetype ?? 'application/pdf',
    size: overrides.size ?? 512,
    status: overrides.status ?? 'ready',
    content: overrides.content ?? 'Quarterly brief',
    url: overrides.url ?? 'https://example.test/brief.pdf',
    uploadedAt: overrides.uploadedAt ?? new Date(),
  };

  if (overrides.textContent !== undefined) {
    file.textContent = overrides.textContent;
  }
  if (overrides.thumbnail !== undefined) {
    file.thumbnail = overrides.thumbnail;
  }
  if (overrides.metadata !== undefined) {
    file.metadata = overrides.metadata;
  }
  if (overrides.vectorIds !== undefined) {
    file.vectorIds = overrides.vectorIds;
  }

  return file;
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
