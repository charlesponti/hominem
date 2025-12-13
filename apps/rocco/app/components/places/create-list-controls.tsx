import { Button } from '@hominem/ui/button'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import ListForm from '~/components/lists/list-form'
import type { List } from '~/lib/types'

interface CreateListControlsProps {
  isAuthenticated: boolean
  onCreate: (newList: Pick<List, 'id'>) => void
}

export default function CreateListControls({ isAuthenticated, onCreate }: CreateListControlsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formAnim, setFormAnim] = useState<'in' | 'out' | null>(null)

  return (
    <div className="w-full space-y-3">
      {!showCreateForm ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              setFormAnim('in')
              setShowCreateForm(true)
            }}
            className="transition-all duration-300 hover:scale-105 focus:scale-105"
            disabled={!isAuthenticated}
          >
            <PlusCircle size={18} className="transition-transform duration-300" />
            <span className="transition-opacity duration-300">New List</span>
          </Button>
        </div>
      ) : null}

      {showCreateForm ? (
        <div
          className={`border rounded-lg p-4 bg-gray-50 ${
            formAnim === 'in'
              ? 'animate-fade-in-up'
              : formAnim === 'out'
                ? 'animate-fade-out-down'
                : 'animate-none'
          }`}
          onAnimationEnd={() => {
            if (formAnim === 'out') {
              setShowCreateForm(false)
              setFormAnim(null)
            }
          }}
        >
          <ListForm
            isAuthenticated={isAuthenticated}
            onCreate={(newList) => {
              onCreate(newList)
              setFormAnim('out')
            }}
            onCancel={() => setFormAnim('out')}
          />
        </div>
      ) : null}
    </div>
  )
}
