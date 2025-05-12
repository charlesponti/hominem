import { FileText, ListChecks, Send } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

// Define InputMode type locally or import from a shared location if available
type InputMode = 'note' | 'task'

interface CreateItemDrawerProps {
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
  inputValue: string
  setInputValue: (value: string) => void
  inputTitle: string
  setInputTitle: (value: string) => void
  handleCreateItem: () => void
}

export function CreateItemDrawer({
  inputMode,
  setInputMode,
  inputValue,
  setInputValue,
  inputTitle,
  setInputTitle,
  handleCreateItem,
}: CreateItemDrawerProps) {
  return (
    <DrawerContent>
      <div className="mx-auto w-full max-w-3xl">
        <DrawerHeader>
          <DrawerTitle>Create New {inputMode === 'note' ? 'Note' : 'Task'}</DrawerTitle>
          <DrawerDescription>Fill in the details below to add a new {inputMode}.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0">
          <div>
            <Input
              placeholder={
                inputMode === 'note'
                  ? 'Note title (optional)'
                  : 'Task title (required if no description)'
              }
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="relative z-10 mb-2 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
            />
            <Textarea
              placeholder={
                inputMode === 'note'
                  ? 'Type your note... Use #tag to add tags'
                  : 'Type task description (optional if title exists)...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={3}
              className="relative z-10 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
            />
            <div className="flex justify-between items-center mt-3 relative z-10">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={inputMode === 'note' ? 'default' : 'outline'}
                  onClick={() => setInputMode('note')}
                  className={cn(
                    'transition-all hover:shadow-md',
                    inputMode === 'note'
                      ? 'bg-blue-500/90 hover:bg-blue-600/90 text-white backdrop-blur-sm'
                      : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                  )}
                >
                  <FileText className="h-4 w-4 mr-2" /> Note
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === 'task' ? 'default' : 'outline'}
                  onClick={() => setInputMode('task')}
                  className={cn(
                    'transition-all hover:shadow-md',
                    inputMode === 'task'
                      ? 'bg-green-500/90 hover:bg-green-600/90 text-white backdrop-blur-sm'
                      : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                  )}
                >
                  <ListChecks className="h-4 w-4 mr-2" /> Task
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button
            onClick={handleCreateItem}
            disabled={
              (!inputValue.trim() && !inputTitle.trim()) ||
              (inputMode === 'note' && !inputValue.trim())
            }
            className="w-full bg-indigo-500/90 hover:bg-indigo-600/90 text-white backdrop-blur-sm transition-all hover:shadow-md disabled:bg-slate-300/70 disabled:text-slate-500/90 dark:disabled:bg-slate-700/70 dark:disabled:text-slate-500/90"
          >
            <Send className="h-4 w-4 mr-2" /> Add {inputMode === 'note' ? 'Note' : 'Task'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent>
  )
}
