import { ApplicationNotesRepository, CareerRepository, db } from '@hominem/db';
import { Textarea } from '@ponti-studios/ui/forms';
import { Button, Card, CardContent } from '@ponti-studios/ui/primitives';
import { Form } from 'react-router';

import { userContext } from '~/lib/middleware';
import { formatApplicationDate } from '~/lib/utils/applicationUtils';

import { Route } from './+types/applications.$id.notes';

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const belongsToOwner = await CareerRepository.applicationBelongsToOwner(db, user.id, params.id);
  if (!belongsToOwner) throw new Response('Application not found', { status: 404 });

  const notes = await ApplicationNotesRepository.list(db, params.id);
  return { notes };
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
      await ApplicationNotesRepository.remove(db, params.id, id);
    }
    return { ok: true };
  }

  const content = (formData.get('content') as string)?.trim();
  if (content) {
    await ApplicationNotesRepository.create(db, params.id, content);
  }
  return { ok: true };
}

export default function ApplicationNotesRoute({ loaderData }: Route.ComponentProps) {
  const { notes } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <Form method="post" navigate={false} className="flex flex-col gap-3">
        <Textarea name="content" rows={3} placeholder="Add a note..." required />
        <div className="flex justify-end">
          <Button type="submit">Add note</Button>
        </div>
      </Form>

      {notes.length === 0 ? (
        <p className="body-3 text-muted-foreground text-center py-6">No notes yet.</p>
      ) : (
        <Card>
          <CardContent className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="body-3 whitespace-pre-wrap">{note.content}</p>
                  <Form method="post" navigate={false}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={note.id} />
                    <button
                      type="submit"
                      className="footnote shrink-0 text-muted-foreground hover:text-destructive-text"
                    >
                      Remove
                    </button>
                  </Form>
                </div>
                <p className="footnote text-muted-foreground mt-2">
                  {formatApplicationDate(note.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
