import type { AppApplicationNotes, Selectable } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ponti-studios/ui/forms';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ponti-studios/ui/overlays';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@ponti-studios/ui/primitives';
import { useState } from 'react';
import { Form, useSubmit } from 'react-router';

import { replaceUnderscores } from '@hominem/utils/text';

import { getApplicationNoteTone } from '~/lib/utils/applicationNoteUtils';

interface NotesTabProps {
  notes: Selectable<AppApplicationNotes>[];
  applicationId: string;
}

export function ApplicationNotesTab({ notes }: NotesTabProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const submit = useSubmit();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="heading-3 text-foreground">Notes & Feedback</h3>
        <Button onClick={() => setShowAddNote(true)}>Add Note</Button>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <Card>
          <CardHeader>
            <CardTitle className="heading-4">Add Note</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" onSubmit={() => setShowAddNote(false)} className="space-y-4">
              <input type="hidden" name="operation" value="add_note" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="noteType" className="subheading-4 text-foreground">
                    Note Type
                  </Label>
                  <Select name="noteType" defaultValue="general">
                    <SelectTrigger id="noteType" className="w-full">
                      <SelectValue placeholder="Select note type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="noteTitle" className="subheading-4 text-foreground">
                    Title (Optional)
                  </Label>
                  <Input id="noteTitle" name="noteTitle" placeholder="Note title" />
                </div>
              </div>

              <div>
                <Label htmlFor="noteContent" className="subheading-4 text-foreground">
                  Content
                </Label>
                <Textarea
                  id="noteContent"
                  name="noteContent"
                  rows={4}
                  required
                  placeholder="Write your note here..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Add Note</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddNote(false)}>
                  Cancel
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            description="Add your first note above."
            variant="quiet"
          />
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    {note.title ? (
                      <h4 className="subheading-4 text-foreground">{note.title}</h4>
                    ) : null}
                    <Badge variant="outline" className={getApplicationNoteTone(note.type)}>
                      {replaceUnderscores(note.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="body-3 text-muted-foreground whitespace-nowrap">
                      {new Date(note.createdat).toLocaleDateString()}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button type="button" variant="destructive" size="sm">
                            Delete
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => {
                              const formData = new FormData();
                              formData.append('operation', 'delete_note');
                              formData.append('noteId', note.id);
                              submit(formData, { method: 'post' });
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="whitespace-pre-wrap body-3 text-foreground/90">{note.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
