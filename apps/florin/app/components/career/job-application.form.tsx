import { useAuth } from '@clerk/nextjs'
import type { JobApplication } from '@hominem/utils/career'
import { Plus, PlusCircle } from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { CompanySelect } from '~/components/company-select'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { JobApplicationStage, JobApplicationStatus } from '~/lib/career'
import { useCreateApplication, useDeleteApplication } from '~/lib/hooks/useApplications'

export function EditApplicationDialog({
  application,
  onOpenChange,
}: {
  application: JobApplication
  onOpenChange: () => void
}) {
  return (
    <Dialog open={!!application} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit Application</DialogTitle>
        <JobApplicationForm application={application} />
      </DialogContent>
    </Dialog>
  )
}

export function CreateApplicationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-lg border border-gray-300">
          <Plus size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create Application</DialogTitle>
        <JobApplicationForm />
      </DialogContent>
    </Dialog>
  )
}

export function JobApplicationForm({ application }: { application?: JobApplication }) {
  const { userId } = useAuth()
  const { createApplication } = useCreateApplication()
  const deleteApplication = useDeleteApplication()
  const [position, setPosition] = useState(application?.position ?? '')
  const [companyId, setCompanyId] = useState(application?.companyId ?? '')
  const [date, setDate] = useState(
    application?.startDate.toISOString() ?? new Date().toISOString().split('T')[0]
  )
  const [status, setStatus] = useState(application?.status ?? JobApplicationStatus.APPLIED)
  const [location, setLocation] = useState(application?.location ?? '')
  const [jobPosting, setJobPosting] = useState(application?.jobPosting ?? '')
  const [salaryQuoted, setSalaryQuoted] = useState(application?.salaryQuoted ?? '')
  const statusOptions = useMemo(() => Object.values(JobApplicationStatus), [])

  const onDeleteClick = useCallback(() => {
    if (application) {
      deleteApplication.mutateAsync(application.id)
    }
  }, [application, deleteApplication])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!userId) return
    if (position && companyId) {
      await createApplication.mutateAsync({
        position,
        companyId,
        status,
        startDate: new Date(date),
        reference: false,
        endDate: null,
        stages: [
          {
            stage: JobApplicationStage.APPLICATION,
            date: new Date().toISOString(),
          },
        ],
        location,
        jobPosting,
        salaryQuoted,
        coverLetter: null,
        salaryAccepted: null,
        resume: null,
        jobId: null,
        link: null,
        phoneScreen: null,
        userId,
      })

      // Reset form
      setPosition('')
      setCompanyId('')
      setDate(new Date().toISOString())
      setStatus(JobApplicationStage.APPLICATION)
      setLocation('')
      setJobPosting('')
      setSalaryQuoted('')
    }
  }

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Input
              placeholder="Job Title"
              name="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
            <CompanySelect value={companyId} onSelectAction={setCompanyId} />
          </div>
          <Input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            value={status}
            onValueChange={(value: string) => setStatus(value as JobApplicationStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            placeholder="Job Posting URL"
            name="job_posting"
            value={jobPosting}
            onChange={(e) => setJobPosting(e.target.value)}
          />
          <Input
            placeholder="Salary Quoted"
            name="salary_quoted"
            value={salaryQuoted}
            onChange={(e) => setSalaryQuoted(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Application
        </Button>
      </form>
      {application?.id ? (
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:bg-red-500 hover:text-white"
          onClick={onDeleteClick}
        >
          Delete
        </Button>
      ) : null}
    </div>
  )
}
