import type { WorkExperienceRecord } from '@hominem/db';
import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { PencilIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useWorkExperienceSection } from '~/hooks/useWorkExperienceSection';
import type { WorkExperienceMetadata } from '~/lib/career/queries/career-progression';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  formatDateRange,
  formatOptionalLabel,
  normalizeOptionalText,
  toMonthInputValue,
  WORK_ARRANGEMENT_OPTIONS,
  type OverviewFormValues,
} from '~/lib/career/work-experience-form';

import { DetailRow, SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function OverviewSection({
  workExperience,
  metadata,
}: {
  workExperience: WorkExperienceRecord;
  metadata: WorkExperienceMetadata;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      role: workExperience.role ?? '',
      company: workExperience.company ?? '',
      startDate: toMonthInputValue(workExperience.startDate),
      endDate: toMonthInputValue(workExperience.endDate),
      employmentType: workExperience.employmentType ?? '',
      workArrangement: workExperience.workArrangement ?? '',
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
    control,
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
      employmentType: normalizeOptionalText(values.employmentType),
      workArrangement: normalizeOptionalText(values.workArrangement),
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
            <Field label="Role" error={errors.role?.message}>
              <Input {...register('role', { required: 'Add the role title.' })} />
            </Field>
            <Field label="Company" error={errors.company?.message}>
              <Input {...register('company', { required: 'Add the company name.' })} />
            </Field>
            <Field label="Start month" error={errors.startDate?.message}>
              <Input type="month" {...register('startDate')} />
            </Field>
            <Field label="End month" helpText="Leave blank for a current role.">
              <Input type="month" {...register('endDate')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employment type">
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value === '__none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select one</SelectItem>
                      {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatOptionalLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Work arrangement">
              <Controller
                control={control}
                name="workArrangement"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value === '__none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select one</SelectItem>
                      {WORK_ARRANGEMENT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatOptionalLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field
            label="Description"
            helpText="Focus on scope, responsibilities, and the shape of the role."
          >
            <Textarea rows={5} {...register('description')} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Location">
              <Input placeholder="San Francisco, CA" {...register('location')} />
            </Field>
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
            <DetailRow label="Role" value={workExperience.role || 'Not set'} />
            <DetailRow label="Company" value={workExperience.company || 'Not set'} />
            <DetailRow
              label="Timeline"
              value={formatDateRange(workExperience.startDate, workExperience.endDate)}
            />
            <DetailRow
              label="Employment"
              value={formatOptionalLabel(workExperience.employmentType) ?? 'Not set'}
            />
            <DetailRow
              label="Arrangement"
              value={formatOptionalLabel(workExperience.workArrangement) ?? 'Not set'}
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
