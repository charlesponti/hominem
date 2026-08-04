import { ApplicationFilesRepository, CareerRepository, db } from '@hominem/db';
import { TextField } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { PaperclipIcon } from 'lucide-react';
import { Form } from 'react-router';

import { userContext } from '~/lib/middleware';

import { Route } from './+types/applications.$id.files';

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

  const fileName = (formData.get('fileName') as string)?.trim();
  const fileUrl = (formData.get('fileUrl') as string)?.trim();
  if (fileName && fileUrl) {
    await ApplicationFilesRepository.create(db, params.id, {
      fileName,
      fileUrl,
      fileType: (formData.get('fileType') as string) || null,
    });
  }
  return { ok: true };
}

export default function ApplicationFilesRoute({ loaderData }: Route.ComponentProps) {
  const { files } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <Form method="post" navigate={false} className="grid grid-cols-3 gap-3 items-end">
        <TextField label="File name" name="fileName" placeholder="Resume.pdf" required />
        <TextField label="URL" name="fileUrl" placeholder="https://" required />
        <div>
          <Button type="submit" variant="outline">
            Add file
          </Button>
        </div>
      </Form>

      {files.length === 0 ? (
        <p className="body-3 text-muted-foreground text-center py-6">No files yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
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
                <button
                  type="submit"
                  className="footnote shrink-0 text-muted-foreground hover:text-destructive-text"
                >
                  Remove
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
