import type { CareerEngagementRecord } from '@hominem/db/career';
import { DatePicker, Input, Switch } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { useState } from 'react';
import { Form, useNavigation } from 'react-router';

interface PositionEditorProps {
  position?: CareerEngagementRecord;
  onCancel?: () => void;
  submitLabel?: string;
}

export function PositionEditor({
  position,
  onCancel,
  submitLabel = 'Save position',
}: PositionEditorProps) {
  const [isCurrent, setIsCurrent] = useState(position?.isCurrent ?? false);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post" className="space-y-5">
      {position && <input type="hidden" name="intent" value="update-position" />}
      {position && <input type="hidden" name="id" value={position.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="company">Company *</label>
          <Input id="company" name="company" defaultValue={position?.company ?? ''} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="title">Title *</label>
          <Input id="title" name="title" defaultValue={position?.title ?? ''} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="location">Location</label>
          <Input id="location" name="location" defaultValue={position?.location ?? ''} />
        </div>
        <div className="space-y-2">
          <label htmlFor="url">URL</label>
          <Input id="url" name="url" type="url" defaultValue={position?.url ?? ''} />
        </div>
        <div className="space-y-2">
          <label htmlFor="kind">Engagement type</label>
          <select
            id="kind"
            name="kind"
            defaultValue={position?.kind ?? 'EMPLOYMENT'}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="EMPLOYMENT">Employment</option>
            <option value="CONTRACT">Contract</option>
            <option value="FREELANCE">Freelance</option>
            <option value="VOLUNTEER">Volunteer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <DatePicker
            mode="range"
            id="startDate"
            key={isCurrent ? 'current-role' : 'fixed-term'}
            startName="startDate"
            endName="endDate"
            label="Dates"
            defaultValue={
              isCurrent
                ? { from: position?.startDate }
                : { from: position?.startDate, to: position?.endDate }
            }
          />
        </div>
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} name="isCurrent" />
            Current role
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="salaryLow">Salary low ($/yr)</label>
          <Input
            id="salaryLow"
            name="salaryLow"
            type="number"
            defaultValue={position?.salaryLow != null ? String(position.salaryLow / 100) : ''}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="salaryHigh">Salary high ($/yr)</label>
          <Input
            id="salaryHigh"
            name="salaryHigh"
            type="number"
            defaultValue={position?.salaryHigh != null ? String(position.salaryHigh / 100) : ''}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="currency">Currency</label>
          <Input id="currency" name="currency" defaultValue={position?.currency ?? 'USD'} />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={position?.description ?? ''}
          className="w-full resize-none rounded-lg border border-border px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="contactName">Contact name</label>
          <Input id="contactName" name="contactName" defaultValue={position?.contactName ?? ''} />
        </div>
        <div className="space-y-2">
          <label htmlFor="contactPhone">Contact phone</label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={position?.contactPhone ?? ''}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="address">Address</label>
          <Input id="address" name="address" defaultValue={position?.address ?? ''} />
        </div>
        <div className="space-y-2">
          <label htmlFor="source">Source</label>
          <Input id="source" name="source" defaultValue={position?.source ?? ''} />
        </div>
      </div>

      {!isCurrent && (
        <div className="space-y-2">
          <label htmlFor="reasonForLeaving">Reason for leaving</label>
          <textarea
            id="reasonForLeaving"
            name="reasonForLeaving"
            rows={3}
            defaultValue={position?.reasonForLeaving ?? ''}
            className="w-full resize-none rounded-lg border border-border px-3 py-2"
          />
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
