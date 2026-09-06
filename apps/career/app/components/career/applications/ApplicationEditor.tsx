import type { CareerApplicationWithRelations } from '@hominem/db/career';
import { humanizeIdentifier } from '@hominem/utils/text';
import {
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { Form, useNavigation } from 'react-router';

import { JOB_APPLICATION_STATUSES } from '~/types/career';

interface ApplicationEditorProps {
  application: CareerApplicationWithRelations;
  onCancel: () => void;
}

export function ApplicationEditor({ application, onCancel }: ApplicationEditorProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="rounded-lg border border-border p-5">
      <h3 className="heading-4 mb-4">Edit application</h3>
      <Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="update-application" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="title">Job title</label>
            <Input id="title" name="title" defaultValue={application.title} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="company">Company</label>
            <Input id="company" name="company" defaultValue={application.company} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="location">Location</label>
            <Input id="location" name="location" defaultValue={application.location ?? ''} />
          </div>
          <div className="space-y-2">
            <label htmlFor="source">Source</label>
            <Input id="source" name="source" defaultValue={application.source ?? ''} />
          </div>
          <div className="space-y-2">
            <DatePicker
              id="appliedAt"
              name="appliedAt"
              label="Applied date"
              defaultValue={application.appliedAt}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="status">Status</label>
            <Select name="status" defaultValue={application.status ?? undefined}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {JOB_APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {humanizeIdentifier(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="salaryExpectation">Salary expectation ($/yr)</label>
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
            <label htmlFor="jobPostingUrl">Job posting URL</label>
            <Input
              id="jobPostingUrl"
              name="jobPostingUrl"
              type="url"
              defaultValue={application.jobPostingUrl ?? ''}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="notes">Notes</label>
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
