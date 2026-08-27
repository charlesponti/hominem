import { Shimmer } from '~/components/ai-elements/shimmer';
import { ChatTaskReview } from '~/components/chat/chat-task-review';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import type { ChatTaskExtraction } from '~/lib/hooks/use-chat-task-extraction';

export function ChatTaskExtractionDialog({ extraction }: { extraction: ChatTaskExtraction }) {
  const { isTaskDialogOpen, onOpenChange, isExtracting, proposedTasks, taskError, retry } =
    extraction;

  return (
    <Dialog onOpenChange={onOpenChange} open={isTaskDialogOpen}>
      <DialogContent
        aria-describedby="task-extraction-description"
        className="max-h-[min(80vh,42rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{proposedTasks ? 'Review proposed tasks' : 'Extracting tasks'}</DialogTitle>
          <DialogDescription id="task-extraction-description">
            {proposedTasks
              ? 'Choose the tasks you want to add to your task list.'
              : 'Reading this conversation for actionable tasks.'}
          </DialogDescription>
        </DialogHeader>
        {isExtracting ? (
          <div
            aria-label="Extracting tasks"
            className="flex min-h-48 items-center justify-center"
            role="status"
          >
            <Shimmer duration={1}>Thinking</Shimmer>
          </div>
        ) : proposedTasks ? (
          <ChatTaskReview
            error={taskError ?? undefined}
            isSaving={extraction.isSaving}
            onAccept={extraction.accept}
            onReject={extraction.reject}
            onRetry={retry}
            tasks={proposedTasks}
          />
        ) : taskError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
            <p className="text-sm text-destructive">{taskError}</p>
            <Button onClick={retry} size="sm" type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
