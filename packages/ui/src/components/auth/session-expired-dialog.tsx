import { useNavigate } from 'react-router'

import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface SessionExpiredDialogProps {
  open: boolean
  onSignIn: () => void
}

export function SessionExpiredDialog({ open, onSignIn }: SessionExpiredDialogProps) {
  const navigate = useNavigate()

  const handleSignIn = () => {
    onSignIn()
    navigate('/auth')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSignIn()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            Your session has expired. Please sign in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleSignIn}>Sign In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
