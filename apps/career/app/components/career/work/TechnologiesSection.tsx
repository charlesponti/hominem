import { Textarea } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { PencilIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useWorkExperienceSection } from '~/hooks/useWorkExperienceSection';
import type { TechnologiesFormValues } from '~/lib/career/work-experience-form';

import { SectionCard, SectionEmptyState, SectionFormActions } from './section-ui';

export function TechnologiesSection({ technologies }: { technologies: string[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const defaultValues = useMemo(
    () => ({
      technologies: technologies.join(', '),
    }),
    [technologies],
  );
  const { isSubmitting, submissionError, submitUpdates, clearSubmissionError } =
    useWorkExperienceSection({
      errorMessage: 'We couldn’t save the technologies. Try again.',
    });
  const { register, handleSubmit, reset } = useForm<TechnologiesFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<TechnologiesFormValues> = (values) =>
    submitUpdates({
      metadata: {
        technologies: values.technologies
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      },
    });

  return (
    <SectionCard
      title="Technologies"
      action={
        isEditing ? null : (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" />
            Edit technologies
          </Button>
        )
      }
    >
      {isEditing ? (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormErrorAlert title="Technologies weren’t saved" message={submissionError} />
          <div className="space-y-1.5">
            <Label className="subheading-4 text-muted-foreground">Technologies</Label>
            <p className="body-4 text-muted-foreground">
              Use a comma-separated list, like React, TypeScript, GraphQL.
            </p>
            <Textarea rows={4} {...register('technologies')} />
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
      ) : technologies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {technologies.map((technology) => (
            <span
              key={technology}
              className="body-4 rounded-full border px-3 py-1 text-foreground/90"
            >
              {technology}
            </span>
          ))}
        </div>
      ) : (
        <SectionEmptyState copy="Add the tools or technologies that define this experience." />
      )}
    </SectionCard>
  );
}
