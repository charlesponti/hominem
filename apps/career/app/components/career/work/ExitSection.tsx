import type { CareerPositionRecord } from '@hominem/db';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
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

export function ExitSection({ workExperience }: { workExperience: CareerPositionRecord }) {
  const we = workExperience as Record<string, any>;
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      reasonForLeaving: we.projectStatus ?? '',
    }),
    [workExperience],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the exit details. Try again.',
    });
  const { control, handleSubmit, reset } = useForm<ExitFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<ExitFormValues> = (values) =>
    submitUpdates({
      reasonForLeaving: normalizeOptionalText(values.reasonForLeaving),
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

          <div className="space-y-1.5">
            <Label className="subheading-4 text-muted-foreground">Reason for leaving</Label>
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
      ) : hasExitDetails(we as CareerPositionRecord) ? (
        <div className="space-y-4">
          <DetailRow
            label="Reason for leaving"
            value={formatOptionalLabel(we.projectStatus) ?? 'Not set'}
          />
        </div>
      ) : (
        <SectionEmptyState copy="Leave this empty unless the reason for ending the role is important to keep." />
      )}
    </SectionCard>
  );
}
