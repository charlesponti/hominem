import type { CareerPositionRecord } from '@hominem/db';
import { Input, Textarea } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { PencilIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useWorkExperienceSection } from '~/hooks/useWorkExperienceSection';
import type { WorkExperienceMetadata } from '~/lib/career/queries/career-progression';
import {
  formatDateRange,
  normalizeOptionalText,
  toMonthInputValue,
  type OverviewFormValues,
} from '~/lib/career/work-experience-form';

import { DetailRow, SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function OverviewSection({
  workExperience,
  metadata,
}: {
  workExperience: CareerPositionRecord;
  metadata: WorkExperienceMetadata;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      role: workExperience.title ?? '',
      company: workExperience.company ?? '',
      startDate: toMonthInputValue(workExperience.startDate),
      endDate: toMonthInputValue(workExperience.endDate),
      description: workExperience.description ?? '',
      location: metadata.location ?? '',
    }),
    [metadata.location, workExperience],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the overview. Try again.',
    });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OverviewFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<OverviewFormValues> = (values) =>
    submitUpdates({
      role: values.role.trim(),
      company: values.company.trim(),
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      description: values.description.trim(),
      metadata: {
        location: normalizeOptionalText(values.location),
      },
    });

  return (
    <SectionCard
      title="Overview"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit overview
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Overview wasn’t saved" message={submissionError} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Role</Label>
              <Input {...register('role', { required: 'Add the role title.' })} />
              {errors.role?.message && (
                <p className="body-4 text-destructive">{errors.role.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Company</Label>
              <Input {...register('company', { required: 'Add the company name.' })} />
              {errors.company?.message && (
                <p className="body-4 text-destructive">{errors.company.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Start month</Label>
              <Input type="month" {...register('startDate')} />
              {errors.startDate?.message && (
                <p className="body-4 text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">End month</Label>
              <p className="body-4 text-muted-foreground">Leave blank for a current role.</p>
              <Input type="month" {...register('endDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="subheading-4 text-muted-foreground">Description</Label>
            <p className="body-4 text-muted-foreground">
              Focus on scope, responsibilities, and the shape of the role.
            </p>
            <Textarea rows={5} {...register('description')} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Location</Label>
              <Input placeholder="San Francisco, CA" {...register('location')} />
            </div>
          </div>

          <SectionFormActions
            isSubmitting={isSubmitting}
            onCancel={() => {
              reset(defaultValues);
              clearSubmissionError();
              setIsEditing(false);
            }}
          />
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Role" value={workExperience.title || 'Not set'} />
            <DetailRow label="Company" value={workExperience.company || 'Not set'} />
            <DetailRow
              label="Timeline"
              value={formatDateRange(workExperience.startDate, workExperience.endDate)}
            />
            <DetailRow label="Location" value={metadata.location ?? 'Not set'} />
          </div>

          <div className="space-y-2">
            <p className="ui-eyebrow">Description</p>
            {workExperience.description ? (
              <p className="body-2 max-w-3xl whitespace-pre-wrap text-foreground/90">
                {workExperience.description}
              </p>
            ) : (
              <SectionEmptyState copy="Add a short description so the role has context beyond the title." />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
