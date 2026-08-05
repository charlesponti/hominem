import { Textarea } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useWorkExperienceSection } from '~/hooks/useWorkExperienceSection';
import type { AchievementsFormValues } from '~/lib/career/work-experience-form';

import { SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function AchievementsSection({ achievements }: { achievements: string[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      items: achievements.length > 0 ? achievements.map((value) => ({ value })) : [{ value: '' }],
    }),
    [achievements],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the achievements. Try again.',
    });
  const { control, register, handleSubmit, reset } = useForm<AchievementsFormValues>({
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<AchievementsFormValues> = (values) =>
    submitUpdates({
      metadata: {
        achievements: values.items
          .map((item) => item.value.trim())
          .filter((value) => value.length > 0),
      },
    });

  return (
    <SectionCard
      title="Achievements"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit achievements
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Achievements weren’t saved" message={submissionError} />

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <span className="body-3 mt-3 text-muted-foreground">•</span>
                <div className="flex-1">
                  <div className="space-y-1.5">
                    {index === 0 && (
                      <Label className="subheading-4 text-muted-foreground">Achievement</Label>
                    )}
                    <Textarea rows={3} {...register(`items.${index}.value` as const)} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    fields.length > 1 ? remove(index) : reset({ items: [{ value: '' }] })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={() => append({ value: '' })}>
            <PlusIcon className="size-4" />
            Add achievement
          </Button>

          <SectionFormActions
            isSubmitting={isSubmitting}
            onCancel={() => {
              reset(defaultValues);
              clearSubmissionError();
              setIsEditing(false);
            }}
          />
        </form>
      ) : achievements.length > 0 ? (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div key={achievement} className="flex items-start gap-3">
              <span className="body-3 mt-0.5 text-muted-foreground">•</span>
              <p className="body-2 max-w-3xl whitespace-pre-wrap text-foreground/90">
                {achievement}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <SectionEmptyState copy="Add concrete wins, launches, or measurable outcomes for this role." />
      )}
    </SectionCard>
  );
}
