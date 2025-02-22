import { useApplications } from '@/hooks/useApplications'
import { JobApplicationStatus } from '@/lib/career'
import type { JobApplication } from '@ponti/utils/schema'
import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export const JobApplicationCard = ({
  application: app,
  setSelectedApp,
}: {
  setSelectedApp: (app: JobApplication) => void
  application: JobApplication & { company?: string }
}) => {
  const { deleteApplication, updateApplication } = useApplications()

  async function handleUpdate(id: string, data: Partial<JobApplication>) {
    updateApplication({ data, id })
  }

  async function onStageSelect(status: JobApplication['status']) {
    await handleUpdate(app.id.toString(), { status })
  }

  return (
    <Card key={app.id}>
      <CardHeader>
        <CardTitle className="flex flex-col gap-2">
          <span>{app.position}</span>
          <span className="text-sm italic rounded-2xl border border-gray-500 px-2 max-w-fit text-gray-500">
            {app.company}
          </span>
        </CardTitle>
        <JobApplicationStageSelect status={app.status} onSelect={onStageSelect} />
      </CardHeader>
      <CardContent>
        <div className="md:grid md:grid-cols-2 gap-4 space-y-4">
          <div>
            <p className="font-medium">Current Stage: {app.status}</p>
            <p>Applied: {new Date(app.startDate).toLocaleDateString()}</p>
            <p>Location: {app.location}</p>
          </div>
          {/* <div>
						<p className="font-medium">Stage History:</p>
						{app.stages.map((history) => (
							<p key={crypto.getRandomValues(new Uint32Array(1))[0]}>
								{history.stage} - {new Date(history.date).toLocaleDateString()}
							</p>
						))}
					</div> */}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteApplication(app.id.toString())}
          >
            Delete
          </Button>
          <Button size="sm" onClick={() => setSelectedApp(app)}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function JobApplicationStageSelect({
  status,
  onSelect,
}: {
  status: JobApplication['status']
  onSelect: (status: JobApplication['status']) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex justify-between border border-gray-400">
          {status}
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.values(JobApplicationStatus).map((status: JobApplication['status']) => (
          <DropdownMenuItem key={status} onClick={() => onSelect(status)}>
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
