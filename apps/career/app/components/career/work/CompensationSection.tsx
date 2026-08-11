import type { CareerEngagementRecord } from '@hominem/db';
import { Input } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { PencilIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useWorkExperienceSection } from '~/hooks/useWorkExperienceSection';
import {
  formatCurrency,
  formatCurrencyInput,
  hasCompensation,
  normalizeCurrencyInput,
  type CompensationFormValues,
} from '~/lib/career/work-experience-form';

import { DetailRow, SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function CompensationSection({
  workExperience,
}: {
  workExperience: CareerEngagementRecord;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      baseSalary: formatCurrencyInput(workExperience.salaryLow),
    }),
    [workExperience],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the compensation details. Try again.',
    });
  const { register, handleSubmit, reset } = useForm<CompensationFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<CompensationFormValues> = (values) =>
    submitUpdates({
      baseSalary: normalizeCurrencyInput(values.baseSalary),
    });

  return (
    <SectionCard
      title="Compensation"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit compensation
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Compensation wasn’t saved" message={submissionError} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Base salary</Label>
              <p className="body-4 text-muted-foreground">Enter the annual amount in dollars.</p>
              <Input inputMode="decimal" placeholder="180000" {...register('baseSalary')} />
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
      ) : hasCompensation(workExperience) ? (
        <div className="grid gap-3 md:grid-cols-2">
          <DetailRow
            label="Base salary"
            value={formatCurrency(workExperience.salaryLow) ?? 'Not set'}
          />
        </div>
      ) : (
        <SectionEmptyState copy="Add compensation details if you want this role to be part of your private history." />
      )}
    </SectionCard>
  );
}
