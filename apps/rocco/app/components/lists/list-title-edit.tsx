import { Button } from '@hominem/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import ListTitleForm from './list-title'

interface ListTitleEditProps {
  listId: string
  currentName: string
}

export default function ListTitleEdit({ listId, currentName }: ListTitleEditProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 hover:text-indigo-600 focus-visible:bg-indigo-50"
        >
          <Pencil size={16} />
          <span className="sr-only">Edit list name</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white shadow-xl focus:outline-none">
          <div className="border-b border-border px-6 py-5">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Edit list name
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Update the name of your list
            </Dialog.Description>
          </div>
          <div className="px-6 py-5">
            <ListTitleForm
              listId={listId}
              currentName={currentName}
              onSuccess={() => setIsOpen(false)}
              onCancel={() => setIsOpen(false)}
            />
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <span className="sr-only">Close</span>×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
