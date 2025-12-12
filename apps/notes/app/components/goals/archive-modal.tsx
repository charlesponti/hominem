import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/components/ui/dialog'

interface ArchiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalTitle: string
  onConfirm: () => void
}

export function ArchiveModal({ open, onOpenChange, goalTitle, onConfirm }: ArchiveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure you want to archive this goal?</DialogTitle>
        </DialogHeader>
        <p>
          You are about to archive the goal: <strong>{goalTitle}</strong>. You can view it later by
          selecting "Show Archived".
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
