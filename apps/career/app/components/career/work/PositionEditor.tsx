import type { CareerEngagementRecord } from '@hominem/db';
import { DateField, Input, Switch } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
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

  const hideEndDate = isCurrent;

  return (
    <Form method="post" className="space-y-5">
      {position && <input type="hidden" name="intent" value="update-position" />}
      {position && <input type="hidden" name="id" value={position.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input id="company" name="company" defaultValue={position?.company ?? ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" defaultValue={position?.title ?? ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={position?.location ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input id="url" name="url" type="url" defaultValue={position?.url ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Engagement type</Label>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <DateField
            id="startDate"
            name="startDate"
            label="Start date"
            defaultValue={position?.startDate}
            placeholder="Pick start date"
          />
        </div>
        {!hideEndDate && (
          <div className="space-y-2">
            <DateField
              id="endDate"
              name="endDate"
              label="End date"
              defaultValue={position?.endDate}
              placeholder="Pick end date"
            />
          </div>
        )}
        <div className="space-y-2 flex items-end">
          <Label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
            Current role
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salaryLow">Salary low ($/yr)</Label>
          <Input
            id="salaryLow"
            name="salaryLow"
            type="number"
            defaultValue={position?.salaryLow != null ? String(position.salaryLow / 100) : ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryHigh">Salary high ($/yr)</Label>
          <Input
            id="salaryHigh"
            name="salaryHigh"
            type="number"
            defaultValue={position?.salaryHigh != null ? String(position.salaryHigh / 100) : ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={position?.currency ?? 'USD'} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
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
          <Label htmlFor="contactName">Contact name</Label>
          <Input id="contactName" name="contactName" defaultValue={position?.contactName ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={position?.contactPhone ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={position?.address ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" defaultValue={position?.source ?? ''} />
        </div>
      </div>

      {!isCurrent && (
        <div className="space-y-2">
          <Label htmlFor="reasonForLeaving">Reason for leaving</Label>
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
