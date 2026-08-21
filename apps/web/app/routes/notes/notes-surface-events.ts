export const NOTES_ROW_EXIT_REQUEST_EVENT = 'notes:row-exit-request';

export interface NotesRowExitRequestDetail {
  noteId: string;
}

const NOTES_ROW_EXIT_TIMEOUT = 240;

export function requestNotesRowExit(noteId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const detail: NotesRowExitRequestDetail = { noteId };
    const completionEvent = `${NOTES_ROW_EXIT_REQUEST_EVENT}:${noteId}:done`;
    let timeoutId = 0;

    const handleDone = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(completionEvent, handleDone);
      resolve();
    };

    timeoutId = window.setTimeout(handleDone, NOTES_ROW_EXIT_TIMEOUT);
    window.addEventListener(completionEvent, handleDone, { once: true });
    window.dispatchEvent(
      new CustomEvent<NotesRowExitRequestDetail>(NOTES_ROW_EXIT_REQUEST_EVENT, { detail }),
    );
  });
}

export function completeNotesRowExit(noteId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(`${NOTES_ROW_EXIT_REQUEST_EVENT}:${noteId}:done`));
}
