import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import type { ChatRuntime } from '~/lib/hooks/use-chat-runtime';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function pendingApproval(interrupt: unknown) {
  const root = record(interrupt);
  const value = record(root.value);
  const approval = record(root.approval ?? value.approval);
  const id =
    typeof approval.id === 'string'
      ? approval.id
      : typeof root.interruptId === 'string'
        ? root.interruptId
        : null;
  if (!id) return null;
  return {
    id,
    toolName:
      typeof root.toolName === 'string'
        ? root.toolName
        : typeof value.toolName === 'string'
          ? value.toolName
          : 'Action',
    preview: value.preview ?? root.preview ?? value.input ?? root.input,
  };
}

export function ChatApprovalDialog({ runtime }: { runtime: ChatRuntime }) {
  const approvals = runtime.interrupts.map(pendingApproval).filter((value) => value !== null);
  const current = approvals[0];

  return (
    <Dialog open={current !== undefined}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Approve {current?.toolName ?? 'action'}?</DialogTitle>
          <DialogDescription>
            This action is waiting for your approval before it can continue.
          </DialogDescription>
        </DialogHeader>
        {current?.preview ? (
          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
            {typeof current.preview === 'string'
              ? current.preview
              : JSON.stringify(current.preview, null, 2)}
          </pre>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() =>
              void runtime.addToolApprovalResponse({ id: current!.id, approved: false })
            }
            variant="outline"
          >
            Reject
          </Button>
          <Button
            onClick={() =>
              void runtime.addToolApprovalResponse({ id: current!.id, approved: true })
            }
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
