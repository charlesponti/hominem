import type { WorkExperienceRecord } from '@hominem/db';
import {
  Field,
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
import {
  formatOptionalLabel,
  hasExitDetails,
  normalizeOptionalText,
  REASON_FOR_LEAVING_OPTIONS,
  type ExitFormValues,
} from '~/lib/career/work-experience-form';

import { DetailRow, SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function ExitSection({ workExperience }: { workExperience: WorkExperienceRecord }) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      reasonForLeaving: workExperience.reasonForLeaving ?? '',
      exitNotes: workExperience.exitNotes ?? '',
    }),
    [workExperience],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the exit details. Try again.',
    });
  const { control, register, handleSubmit, reset } = useForm<ExitFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<ExitFormValues> = (values) =>
    submitUpdates({
      reasonForLeaving: normalizeOptionalText(values.reasonForLeaving),
      exitNotes: normalizeOptionalText(values.exitNotes),
    });

  return (
    <SectionCard
      title="Exit"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit exit
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Exit details weren’t saved" message={submissionError} />

          <Field label="Reason for leaving">
            <Controller
              control={control}
              name="reasonForLeaving"
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
                    {REASON_FOR_LEAVING_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatOptionalLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Exit notes">
            <Textarea
              rows={4}
              placeholder="Any nuance you want to remember about the transition."
              {...register('exitNotes')}
            />
          </Field>

          <SectionFormActions
            isSubmitting={isSubmitting}
            onCancel={() => {
              reset(defaultValues);
              clearSubmissionError();
              setIsEditing(false);
            }}
          />
        </form>
      ) : hasExitDetails(workExperience) ? (
        <div className="space-y-4">
          <DetailRow
            label="Reason for leaving"
            value={formatOptionalLabel(workExperience.reasonForLeaving) ?? 'Not set'}
          />
          {workExperience.exitNotes ? (
            <div className="space-y-2">
              <p className="ui-eyebrow">Notes</p>
              <p className="body-2 max-w-3xl whitespace-pre-wrap text-foreground/90">
                {workExperience.exitNotes}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <SectionEmptyState copy="Leave this empty unless the reason for ending the role is important to keep." />
      )}
    </SectionCard>
  );
}
