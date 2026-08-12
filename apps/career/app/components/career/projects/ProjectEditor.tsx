import type { CareerProjectRecord } from '@hominem/db';
import { DateField, TextField, Textarea } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { Form, useNavigation } from 'react-router';

import { AddButton } from '~/components/AddButton';

interface ProjectEditorProps {
  project?: CareerProjectRecord;
  engagements?: Array<{ id: string; title: string; company: string }>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ProjectEditor({
  project,
  engagements = [],
  onCancel,
  submitLabel = 'Save project',
}: ProjectEditorProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const relatedEngagementIds = new Set(project?.engagements.map((e) => e.id) ?? []);

  return (
    <Form method="post" className="flex flex-col gap-4">
      <TextField label="Title" name="title" required defaultValue={project?.title ?? ''} />
      <TextField
        label="Organization"
        name="organization"
        placeholder="Optional company or client"
        defaultValue={project?.organization ?? ''}
      />
      <TextField
        label="Short description"
        name="shortDescription"
        placeholder="One-line summary"
        defaultValue={project?.shortDescription ?? ''}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="status">
          Status
          <select
            id="status"
            name="status"
            defaultValue={project?.status ?? 'BACKLOG'}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </label>
        <div className="space-y-1.5 md:col-span-2">
          <DateField
            mode="range"
            id="startDate"
            startName="startDate"
            endName="endDate"
            label="Dates"
            defaultValue={{ from: project?.startDate, to: project?.endDate }}
          />
        </div>
      </div>

      {engagements.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Related work engagements</legend>
          {engagements.map((engagement) => (
            <label key={engagement.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="engagementIds"
                value={engagement.id}
                defaultChecked={relatedEngagementIds.has(engagement.id)}
              />
              {engagement.title} at {engagement.company}
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-foreground text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={project?.description ?? ''}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Live URL"
          name="liveUrl"
          placeholder="https://"
          defaultValue={project?.liveUrl ?? ''}
        />
        <TextField
          label="GitHub URL"
          name="githubUrl"
          placeholder="https://"
          defaultValue={project?.githubUrl ?? ''}
        />
      </div>

      <TextField
        label="Technologies"
        name="technologies"
        placeholder="TypeScript, React, PostgreSQL"
        helpText="Comma-separated"
        defaultValue={Array.isArray(project?.technologies) ? project.technologies.join(', ') : ''}
      />

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        {submitLabel.startsWith('Add ') ? (
          <AddButton type="submit" label={submitLabel} disabled={isSubmitting} />
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </div>
    </Form>
  );
}
