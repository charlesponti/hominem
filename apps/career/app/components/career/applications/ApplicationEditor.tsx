import type { CareerApplicationWithRelations } from '@hominem/db';
import {
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { useState } from 'react';
import { Form, useNavigation } from 'react-router';

interface ApplicationEditorProps {
  application: CareerApplicationWithRelations;
  onCancel: () => void;
}

export function ApplicationEditor({ application, onCancel }: ApplicationEditorProps) {
  const [appliedAt, setAppliedAt] = useState<Date | undefined>(
    application.appliedAt ? new Date(application.appliedAt) : undefined,
  );
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="rounded-lg border border-border p-5">
      <h3 className="heading-4 mb-4">Edit application</h3>
      <Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="update-application" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job title</Label>
            <Input id="title" name="title" defaultValue={application.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={application.company} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={application.location ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" defaultValue={application.source ?? ''} />
          </div>
          <div className="space-y-2">
            <Label>Applied date</Label>
            <DatePicker
              id="appliedAt"
              value={appliedAt}
              onSelect={setAppliedAt}
              placeholder="Pick applied date"
            />
            <input
              type="hidden"
              name="appliedAt"
              value={appliedAt ? appliedAt.toISOString().split('T')[0] : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={application.status ?? undefined}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {['active', 'rejected', 'withdrew', 'APPLIED', 'INTERVIEWING', 'REJECTED'].map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryExpectation">Salary expectation ($/yr)</Label>
            <Input
              id="salaryExpectation"
              name="salaryExpectation"
              type="number"
              defaultValue={
                application.salaryExpectation != null
                  ? String(application.salaryExpectation / 100)
                  : ''
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobPostingUrl">Job posting URL</Label>
            <Input
              id="jobPostingUrl"
              name="jobPostingUrl"
              type="url"
              defaultValue={application.jobPostingUrl ?? ''}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={application.notes ?? ''}
            className="w-full resize-none rounded-lg border border-border px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
