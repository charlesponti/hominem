'use client'

import { JobApplicationCard } from '@/components/career/job-application.card'
import {
  CreateApplicationDialog,
  EditApplicationDialog,
} from '@/components/career/job-application.form'
import { Input } from '@/components/ui/input'
import { useApplications } from '@/lib/hooks/useApplications'
import type { JobApplication } from '@hominem/utils/career'
import { useState } from 'react'

export default function ApplicationsPage() {
  const [search, setSearch] = useState('')
  const { data: applications } = useApplications()
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null)

  const filteredApplications = applications?.filter((app) =>
    app.position.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold mb-6">Applications</h1>
        <CreateApplicationDialog />
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6 md:px-0">
        <Input
          placeholder="Search applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="md:grid md:grid-cols-2 gap-4">
        {filteredApplications?.map((app) => (
          <JobApplicationCard key={app.id} application={app} setSelectedApp={setSelectedApp} />
        ))}
      </div>

      {/* Edit Dialog */}
      {selectedApp ? (
        <EditApplicationDialog
          application={selectedApp}
          onOpenChange={() => setSelectedApp(null)}
        />
      ) : null}
    </div>
  )
}
