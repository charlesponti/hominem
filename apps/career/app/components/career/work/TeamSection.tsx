import type { CareerPositionRecord } from '@hominem/db';
import {
  Input,
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
  hasTeamDetails,
  normalizeOptionalNumber,
  normalizeOptionalText,
  SENIORITY_LEVEL_OPTIONS,
  type TeamFormValues,
} from '~/lib/career/work-experience-form';

import { DetailRow, SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function TeamSection({ workExperience }: { workExperience: CareerPositionRecord }) {
  const we = workExperience as Record<string, any>;
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      seniorityLevel: we.seniorityLevel ?? '',
      department: we.department ?? '',
      teamSize: we.teamSize?.toString() ?? '',
      directReports: we.directReports?.toString() ?? '',
      reportsTo: we.reportsTo ?? '',
    }),
    [workExperience],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the team details. Try again.',
    });
  const { control, register, handleSubmit, reset } = useForm<TeamFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<TeamFormValues> = (values) =>
    submitUpdates({
      seniorityLevel: normalizeOptionalText(values.seniorityLevel),
      department: normalizeOptionalText(values.department),
      teamSize: normalizeOptionalNumber(values.teamSize),
      directReports: normalizeOptionalNumber(values.directReports),
      reportsTo: normalizeOptionalText(values.reportsTo),
    });

  return (
    <SectionCard
      title="Team"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit team
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Team details weren’t saved" message={submissionError} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Seniority level</Label>
              <Controller
                control={control}
                name="seniorityLevel"
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
                      {SENIORITY_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatOptionalLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Department</Label>
              <Input placeholder="Engineering" {...register('department')} />
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Team size</Label>
              <Input inputMode="numeric" placeholder="12" {...register('teamSize')} />
            </div>
            <div className="space-y-1.5">
              <Label className="subheading-4 text-muted-foreground">Direct reports</Label>
              <Input inputMode="numeric" placeholder="4" {...register('directReports')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="subheading-4 text-muted-foreground">Reports to</Label>
            <Input placeholder="Director of Engineering" {...register('reportsTo')} />
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
      ) : hasTeamDetails(we as CareerPositionRecord) ? (
        <div className="grid gap-3 md:grid-cols-2">
          <DetailRow
            label="Seniority"
            value={formatOptionalLabel(we.seniorityLevel) ?? 'Not set'}
          />
          <DetailRow label="Department" value={we.department ?? 'Not set'} />
          <DetailRow label="Team size" value={we.teamSize != null ? `${we.teamSize}` : 'Not set'} />
          <DetailRow
            label="Direct reports"
            value={we.directReports != null ? `${we.directReports}` : 'Not set'}
          />
          <DetailRow label="Reports to" value={we.reportsTo ?? 'Not set'} />
        </div>
      ) : (
        <SectionEmptyState copy="Add team context if this role included leadership, scope, or reporting details." />
      )}
    </SectionCard>
  );
}
