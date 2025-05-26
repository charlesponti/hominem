import type { JobApplicationStage } from '@hominem/utils/career'
import type { JobApplication } from '@hominem/utils/types'
import { Clock, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { JobApplicationStageDropdown } from './job-application-stage-dropdown'
import { useUpdateApplication } from './use-job-applications'

interface StagesDialogProps {
  applicationId: string
  stages: JobApplication['stages']
}

export function StagesDialog({ applicationId, stages }: StagesDialogProps) {
  const [isAddingStage, setIsAddingStage] = useState(false)
  const { updateApplication } = useUpdateApplication()

  async function handleAddStage(status: JobApplication['stages'][number]['stage']) {
    const newStages = [...stages, { stage: status, date: new Date().toISOString() }]
    await updateApplication.mutateAsync({ id: applicationId, stages: newStages })
  }

  async function handleDeleteStage(index: number) {
    const newStages = stages.filter((_, i) => i !== index)
    await updateApplication.mutateAsync({ id: applicationId, stages: newStages })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock size={16} className="mr-2" />
          View Stages
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Application Stage History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {stages.map((history, index) => (
            <div
              key={new Date(history.date).toLocaleDateString()}
              className="flex justify-between items-center border-b pb-2"
            >
              <span className="font-medium">{history.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {new Date(history.date).toLocaleDateString()}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteStage(index)}>
                  <Trash size={16} color="red" />
                </Button>
              </div>
            </div>
          ))}
          {isAddingStage ? (
            <div className="flex items-center gap-2">
              <JobApplicationStageDropdown
                status="APPLIED"
                onSelect={(status: JobApplicationStage) => {
                  handleAddStage(status)
                  setIsAddingStage(false)
                }}
                variant="default"
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => setIsAddingStage(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsAddingStage(true)}>
              <Plus size={16} className="mr-2" />
              Add Stage
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
