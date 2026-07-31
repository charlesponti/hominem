import type { ProjectRecord as Project } from '@hominem/db';
import { formatDateForInput } from '@hominem/utils/dates';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ponti-studios/ui/forms';
import { Label } from '@ponti-studios/ui/primitives';
import { useCallback, useMemo } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { useFetcher } from 'react-router';

import type { EditorSubmissionResult } from '~/hooks/useCareerEditorSubmission';

import { useCareerEditorSubmission } from '../../hooks/useCareerEditorSubmission';
import { EditorFormActions } from '../EditorFormActions';
import { FormErrorAlert } from '../FormErrorAlert';
import { TagInput } from '../TagInput';

interface ProjectWorkExperienceOption {
  id: string;
  company: string;
  role: string;
}

interface ProjectFormValues {
  id?: string;
  title: string;
  description: string;
  shortDescription?: string;
  liveUrl?: string;
  githubUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  technologies: string[];
  status?: string;
  startDate?: string;
  endDate?: string;
  isFeatured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  portfolioId: string;
  workExperienceId?: string | null;
}

interface ProjectEditorFormProps {
  project?: Project | null;
  portfolioId: string;
  workExperiences: ProjectWorkExperienceOption[];
  initialWorkExperienceId?: string | null;
  action: string;
  onSuccess?: (result: EditorSubmissionResult<Project>) => void;
  onDeleteSuccess?: () => void;
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildProjectDefaults({
  project,
  portfolioId,
  initialWorkExperienceId,
}: {
  project?: Project | null;
  portfolioId: string;
  initialWorkExperienceId?: string | null;
}): ProjectFormValues {
  return {
    id: project?.id,
    title: project?.title || '',
    description: project?.description || '',
    shortDescription: project?.shortDescription || '',
    liveUrl: project?.liveUrl || '',
    githubUrl: project?.githubUrl || '',
    imageUrl: project?.imageUrl || '',
    videoUrl: project?.videoUrl || '',
    technologies: Array.isArray(project?.technologies) ? (project.technologies as string[]) : [],
    status: project?.status || 'completed',
    startDate: formatDateForInput(project?.startDate),
    endDate: formatDateForInput(project?.endDate),
    isFeatured: project?.isFeatured || false,
    isVisible: project?.isVisible !== false,
    sortOrder: project?.sortOrder ?? 0,
    portfolioId: portfolioId,
    workExperienceId: project?.workExperienceId ?? initialWorkExperienceId ?? '',
  };
}

export function formatWorkExperienceOptionLabel(workExperience: ProjectWorkExperienceOption) {
  const company = workExperience.company.trim() || 'Untitled client';
  const role = workExperience.role.trim();
  return role ? `${company} · ${role}` : company;
}

export function ProjectEditorForm({
  project,
  portfolioId,
  workExperiences,
  initialWorkExperienceId,
  action,
  onSuccess,
  onDeleteSuccess,
}: ProjectEditorFormProps) {
  const fetcher = useFetcher();
  const isNew = !project?.id;
  const defaultValues = useMemo(
    () => buildProjectDefaults({ project, portfolioId, initialWorkExperienceId }),
    [project, portfolioId, initialWorkExperienceId],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isDirty, isValid },
  } = useForm<ProjectFormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const { submissionError, clearSubmissionError } = useCareerEditorSubmission<Project>({
    fetcher,
    errorMessage: 'We couldn’t save this project. Try again.',
    onSuccess: (result) => {
      if (result.operation === 'delete') {
        onDeleteSuccess?.();
        return;
      }

      onSuccess?.(result);
    },
  });

  const fetchSkillSuggestions = useCallback(async (query: string) => {
    try {
      const url = new URL('/api/skills/search', window.location.origin);
      url.searchParams.set('q', query);
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions as string[];
    } catch {
      return [];
    }
  }, []);

  const onSubmit: SubmitHandler<ProjectFormValues> = (values) => {
    if (!isDirty && !isNew) {
      return;
    }

    const formData = new FormData();
    formData.append('operation', isNew ? 'create' : 'update');
    formData.append(
      'projectData',
      JSON.stringify({
        ...values,
        shortDescription: normalizeOptionalText(values.shortDescription),
        liveUrl: normalizeOptionalText(values.liveUrl),
        githubUrl: normalizeOptionalText(values.githubUrl),
        imageUrl: normalizeOptionalText(values.imageUrl),
        videoUrl: normalizeOptionalText(values.videoUrl),
        technologies: values.technologies,
        workExperienceId: values.workExperienceId || null,
      }),
    );

    clearSubmissionError();
    fetcher.submit(formData, { method: 'POST', action });
  };

  const handleReset = () => reset(defaultValues);

  const handleDelete = () => {
    if (!project?.id) {
      return;
    }

    const formData = new FormData();
    formData.append('operation', 'delete');
    formData.append('id', project.id);
    formData.append('portfolioId', portfolioId);

    clearSubmissionError();
    fetcher.submit(formData, { method: 'POST', action });
  };

  const isSaving = fetcher.state === 'submitting';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-md border border-border bg-card p-4 space-y-4"
    >
      <FormErrorAlert title="Project request failed" message={submissionError} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-3 text-foreground">{isNew ? 'New Project' : 'Project'}</h2>
        <EditorFormActions
          isSaving={isSaving}
          isNew={isNew}
          isDirty={isDirty}
          isValid={isValid}
          submitLabel={isNew ? 'Create Project' : 'Save Changes'}
          onDelete={!isNew ? handleDelete : undefined}
          onReset={!isNew ? handleReset : undefined}
          deleteConfirmTitle="Delete this project?"
          deleteConfirmDescription="This removes the project from your portfolio. This can't be undone."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-title-${project?.id || 'new'}`}>Project Title *</Label>
          <Input
            id={`project-title-${project?.id || 'new'}`}
            type="text"
            {...register('title', { required: 'Add a project title.' })}
            aria-describedby={
              errors.title ? `project-title-${project?.id || 'new'}-error` : undefined
            }
            aria-invalid={errors.title ? true : undefined}
            placeholder="e.g., E-commerce Platform"
          />
          {errors.title ? (
            <p
              id={`project-title-${project?.id || 'new'}-error`}
              role="alert"
              className="body-4 text-destructive"
            >
              {errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-work-experience-${project?.id || 'new'}`}>
            Client / Work Experience
          </Label>
          <Controller
            control={control}
            name="workExperienceId"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => field.onChange(value === '__unlinked' ? '' : value)}
              >
                <SelectTrigger
                  id={`project-work-experience-${project?.id || 'new'}`}
                  className="w-full"
                >
                  <SelectValue placeholder="Unlinked project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unlinked">Unlinked project</SelectItem>
                  {workExperiences.map((workExperience) => (
                    <SelectItem key={workExperience.id} value={workExperience.id}>
                      {formatWorkExperienceOptionLabel(workExperience)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`project-short-description-${project?.id || 'new'}`}>
          Short Description
        </Label>
        <Input
          id={`project-short-description-${project?.id || 'new'}`}
          type="text"
          {...register('shortDescription')}
          placeholder="Brief one-line description"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`project-description-${project?.id || 'new'}`}>Full Description *</Label>
        <Textarea
          id={`project-description-${project?.id || 'new'}`}
          {...register('description', { required: 'Add a project description.' })}
          aria-describedby={
            errors.description ? `project-description-${project?.id || 'new'}-error` : undefined
          }
          aria-invalid={errors.description ? true : undefined}
          className="min-h-28"
          rows={4}
          placeholder="Detailed project description, features, and technologies used..."
        />
        {errors.description ? (
          <p
            id={`project-description-${project?.id || 'new'}-error`}
            role="alert"
            className="body-4 text-destructive"
          >
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-live-url-${project?.id || 'new'}`}>Live URL</Label>
          <Input
            id={`project-live-url-${project?.id || 'new'}`}
            type="url"
            {...register('liveUrl')}
            placeholder="https://example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-github-url-${project?.id || 'new'}`}>GitHub URL</Label>
          <Input
            id={`project-github-url-${project?.id || 'new'}`}
            type="url"
            {...register('githubUrl')}
            placeholder="https://github.com/user/repo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-image-url-${project?.id || 'new'}`}>Image URL</Label>
          <Input
            id={`project-image-url-${project?.id || 'new'}`}
            type="url"
            {...register('imageUrl')}
            placeholder="Project screenshot or image"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-video-url-${project?.id || 'new'}`}>Video URL</Label>
          <Input
            id={`project-video-url-${project?.id || 'new'}`}
            type="url"
            {...register('videoUrl')}
            placeholder="Demo video URL"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`project-technologies-${project?.id || 'new'}`}>Skills</Label>
        <Controller
          control={control}
          name="technologies"
          render={({ field }) => (
            <TagInput
              id={`project-technologies-${project?.id || 'new'}`}
              value={field.value}
              onChange={field.onChange}
              placeholder="Type to add skills…"
              fetchSuggestions={fetchSkillSuggestions}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-status-${project?.id || 'new'}`}>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value ?? 'completed'}
                onValueChange={(value) => {
                  field.onChange(value);
                  trigger('endDate');
                }}
              >
                <SelectTrigger id={`project-status-${project?.id || 'new'}`} className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-start-date-${project?.id || 'new'}`}>Start Date</Label>
          <Input
            id={`project-start-date-${project?.id || 'new'}`}
            type="date"
            {...register('startDate')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-end-date-${project?.id || 'new'}`}>End Date</Label>
          <Input
            id={`project-end-date-${project?.id || 'new'}`}
            type="date"
            {...register('endDate', {
              validate: (value, formValues) =>
                formValues.status !== 'completed' ||
                Boolean(value) ||
                'Add an end date, or change the status from Completed.',
            })}
            aria-describedby={
              errors.endDate ? `project-end-date-${project?.id || 'new'}-error` : undefined
            }
            aria-invalid={errors.endDate ? true : undefined}
          />
          {errors.endDate ? (
            <p
              id={`project-end-date-${project?.id || 'new'}-error`}
              role="alert"
              className="body-4 text-destructive"
            >
              {errors.endDate.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-sort-order-${project?.id || 'new'}`}>Sort Order</Label>
          <Input
            id={`project-sort-order-${project?.id || 'new'}`}
            type="number"
            {...register('sortOrder', { valueAsNumber: true })}
            min={0}
          />
        </div>
        <Label>
          <input type="checkbox" {...register('isFeatured')} className="checkbox" />
          <span className="label">Featured Project</span>
        </Label>
        <Label>
          <input type="checkbox" {...register('isVisible')} className="checkbox" />
          <span>Visible</span>
        </Label>
      </div>
    </form>
  );
}
