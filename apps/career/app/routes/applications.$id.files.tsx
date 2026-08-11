import { ApplicationFilesRepository, CareerRepository, db } from '@hominem/db';
import { documentStorageService, validateFile } from '@hominem/storage';
import { DropZone, type DropZoneProps } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { PaperclipIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Form } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/applications.$id.files';

type DropZoneStatus = DropZoneProps['status'];

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const belongsToOwner = await CareerRepository.applicationBelongsToOwner(db, user.id, params.id);
  if (!belongsToOwner) throw new Response('Application not found', { status: 404 });

  const files = await ApplicationFilesRepository.list(db, params.id);
  return { files };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const belongsToOwner = await CareerRepository.applicationBelongsToOwner(db, user.id, params.id);
  if (!belongsToOwner) throw new Response('Application not found', { status: 404 });

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const id = formData.get('id');
    if (typeof id === 'string') {
      await ApplicationFilesRepository.remove(db, params.id, id);
    }
    return { ok: true };
  }

  if (intent === 'upload') {
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return { ok: false, error: 'No file provided' };
    }

    const validation = validateFile(file, {
      maxSizeBytes: 25 * 1024 * 1024,
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ],
    });
    if (!validation.valid) {
      return { ok: false, error: validation.error ?? 'Invalid file' };
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await documentStorageService.storeFile(buffer, file.type, user.id, {
        originalName: file.name,
      });

      await ApplicationFilesRepository.create(db, params.id, {
        fileName: file.name,
        fileUrl: stored.url,
        fileType: file.type,
      });

      return { ok: true, stored };
    } catch (error) {
      logger.error('Error uploading file', error, { applicationId: params.id });
      return { ok: false, error: 'Upload failed' };
    }
  }

  return { ok: false, error: 'Unknown intent' };
}

export default function ApplicationFilesRoute({ loaderData }: Route.ComponentProps) {
  const { files } = loaderData;
  const [status, setStatus] = useState<DropZoneStatus>('empty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = () => {
    formRef.current?.requestSubmit();
  };

  if (files.length === 0 && status === 'empty') {
    return (
      <Form method="post" ref={formRef} navigate={false} encType="multipart/form-data">
        <input type="hidden" name="intent" value="upload" />
        <input
          type="file"
          name="file"
          style={{ display: 'none' }}
          id="hidden-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setSelectedFile(file);
              setStatus('armed');
            }
          }}
        />
        <DropZone
          status={status}
          file={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          emptyHint="PDF, Word, or text files — up to 25 MB"
          notice={error || undefined}
          onFiles={(files) => {
            const fileInput = document.getElementById('hidden-file-input') as HTMLInputElement;
            if (fileInput) {
              const dt = new DataTransfer();
              dt.items.add(files[0]);
              fileInput.files = dt.files;
              setSelectedFile(files[0]);
              setError(null);
              setStatus('armed');
            }
          }}
          onSubmit={handleSubmit}
          onClear={() => {
            setStatus('empty');
            setSelectedFile(null);
            setError(null);
          }}
        />
      </Form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Form method="post" ref={formRef} navigate={false} encType="multipart/form-data">
        <input type="hidden" name="intent" value="upload" />
        <input
          type="file"
          name="file"
          style={{ display: 'none' }}
          id="hidden-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setSelectedFile(file);
              setStatus('armed');
            }
          }}
        />
        <DropZone
          status={status}
          file={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          emptyHint="PDF, Word, or text files — up to 25 MB"
          notice={error || undefined}
          onFiles={(files) => {
            const fileInput = document.getElementById('hidden-file-input') as HTMLInputElement;
            if (fileInput) {
              const dt = new DataTransfer();
              dt.items.add(files[0]);
              fileInput.files = dt.files;
              setSelectedFile(files[0]);
              setError(null);
              setStatus('armed');
            }
          }}
          onSubmit={handleSubmit}
          onClear={() => {
            setStatus('empty');
            setSelectedFile(null);
            setError(null);
          }}
        />
      </Form>

      <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface shadow-xs">
        {files.map((file) => (
          <div key={file.id} className="flex items-center justify-between p-4">
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 body-3 min-w-0 text-blue-600 hover:underline"
            >
              <PaperclipIcon className="size-4 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </a>
            <Form method="post" navigate={false}>
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={file.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Remove
              </Button>
            </Form>
          </div>
        ))}
      </div>
    </div>
  );
}
