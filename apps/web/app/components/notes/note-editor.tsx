import type { Note } from '@hominem/rpc/types/notes.types';
import { slugifyText } from '@hominem/utils/text';
import { useCallback } from 'react';

import type { UploadedFile } from '../../lib/types/upload';
import { SurfacePanel } from '../surfaces/surface-panel';
import { DeleteNoteAlert } from './delete-note-alert';
import { NoteActionsPanel } from './note-actions-panel';
import { NoteFilesPanel } from './note-files-panel';
import { useNoteEditor } from './use-note-editor';

interface NoteEditorProps {
  note: Note;
  onSave: (params: {
    id: string;
    title: string | null;
    content: string;
    fileIds: string[];
  }) => Promise<void>;
  onUploadFiles: (files: FileList) => Promise<UploadedFile[]>;
  onDelete: () => Promise<void>;
  isDeleting?: boolean;
  isDeletingError?: boolean;
  uploadErrors?: string[];
  isUploading?: boolean;
}

export function NoteEditor({
  note,
  onSave,
  onUploadFiles,
  onDelete,
  isDeleting = false,
  isDeletingError = false,
  uploadErrors = [],
  isUploading = false,
}: NoteEditorProps) {
  const {
    title,
    setTitle,
    content,
    setContent,
    files,
    setFiles,
    draftRef,
    saveStatus,
    flushSave,
    scheduleIdleSave,
  } = useNoteEditor(
    {
      id: note.id,
      title: note.title,
      content: note.content,
      files: note.files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        url: f.url,
        uploadedAt: f.uploadedAt,
      })),
    },
    onSave,
  );

  const handleAttachFiles = useCallback(
    async (fileList: FileList) => {
      const uploaded = await onUploadFiles(fileList);
      if (uploaded.length === 0) return;
      const nextFiles = [
        ...draftRef.current.files,
        ...uploaded.map((file) => ({
          id: file.id,
          originalName: file.originalName,
          mimetype: file.mimetype,
          size: file.size,
          url: file.url,
          uploadedAt: file.uploadedAt.toISOString(),
        })),
      ];
      setFiles(nextFiles);
      await flushSave();
    },
    [draftRef, flushSave, onUploadFiles, setFiles],
  );

  const handleDetachFile = useCallback(
    async (fileId: string) => {
      const nextFiles = draftRef.current.files.filter((file) => file.id !== fileId);
      setFiles(nextFiles);
      await flushSave();
    },
    [draftRef, flushSave, setFiles],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SurfacePanel>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleIdleSave();
              }}
              onBlur={() => void flushSave().catch(() => undefined)}
              placeholder="Untitled note"
              aria-label="Note title"
              className="w-full border-0 bg-transparent text-3xl font-semibold outline-none placeholder:text-text-tertiary"
            />
            <p className="mt-2 text-sm text-text-secondary">
              Mention this note in chat as <code>#{slugifyText(title || note.title)}</code>.
            </p>
          </div>
          <span className="rounded-full border border-border-subtle px-3 py-1 text-xs uppercase tracking-[0.2em] text-text-secondary">
            {saveStatus}
          </span>
        </div>

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            scheduleIdleSave();
          }}
          onBlur={() => void flushSave().catch(() => undefined)}
          placeholder="Start writing..."
          aria-label="Note content"
          className="mt-6 min-h-[50vh] w-full resize-none border-0 bg-transparent text-base leading-7 outline-none placeholder:text-text-tertiary"
        />
      </SurfacePanel>

      <aside className="space-y-4">
        <NoteActionsPanel
          noteId={note.id}
          onAttachFiles={handleAttachFiles}
          uploadErrors={uploadErrors}
          isUploading={isUploading}
        />

        <NoteFilesPanel files={files} onDetachFile={handleDetachFile} />

        <DeleteNoteAlert onDelete={onDelete} isDeleting={isDeleting} isError={isDeletingError} />
      </aside>
    </div>
  );
}
