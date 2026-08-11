import type { CareerProfileRecord } from '@hominem/db';
import { Input, Switch, Textarea } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { useEffect, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { PhoneField } from '~/components/PhoneField';
import { ProfileImageUpload } from '~/components/ProfileImageUpload';
import type { AccountActionResult, BasicInfoFormValues } from '~/lib/account/types';

export function BasicInfoForm({
  profile,
  accountEmail,
  onSave,
  onImageUpload,
}: {
  profile: CareerProfileRecord;
  accountEmail?: string | null;
  onSave: (values: BasicInfoFormValues) => Promise<AccountActionResult<unknown>>;
  onImageUpload: (croppedImageBlob: Blob) => Promise<string | undefined>;
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isTogglingFlag, setIsTogglingFlag] = useState(false);

  const lockedEmail = accountEmail || profile.email || '';

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
    control,
    getValues,
    setValue,
    watch,
  } = useForm<BasicInfoFormValues>({
    defaultValues: profileToFormValues(profile, lockedEmail),
  });

  const displayName = watch('name') || fullName || lockedEmail || 'Profile';

  useEffect(() => {
    reset(profileToFormValues(profile, lockedEmail));
  }, [profile, lockedEmail, reset]);

  const onSubmit: SubmitHandler<BasicInfoFormValues> = async (formData) => {
    if (!isDirty) {
      return;
    }

    setSubmissionError(null);
    const result = await onSave({ ...formData, email: lockedEmail });

    if (result.success === false) {
      setSubmissionError(result.error || 'We couldn’t save your basic info. Try again.');
      return;
    }

    reset({ ...formData, email: lockedEmail });
  };

  const handleFlagToggle = async (
    field: 'availabilityStatus' | 'openToRemote',
    checked: boolean,
  ) => {
    const previous = getValues(field) ?? false;
    setValue(field, checked, { shouldDirty: false });
    setIsTogglingFlag(true);
    setSubmissionError(null);

    const result = await onSave({
      ...getValues(),
      email: lockedEmail,
      [field]: checked,
    });

    setIsTogglingFlag(false);

    if (result.success === false) {
      setValue(field, previous, { shouldDirty: false });
      setSubmissionError(result.error || 'We couldn’t update that setting. Try again.');
      return;
    }

    reset({ ...getValues(), email: lockedEmail, [field]: checked });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormErrorAlert title="Basic info wasn’t saved" message={submissionError} />

      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <ProfileImageUpload
            compact
            currentImageUrl={profile.profileImageUrl || undefined}
            onUpload={onImageUpload}
          />
          <div className="min-w-0 space-y-1">
            <p className="subheading-3 truncate">{displayName}</p>
            <p className="body-4 text-muted-foreground">
              Updated {new Date(profile.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="name" className="subheading-4 text-muted-foreground">
              Full Name
            </Label>
            <Input id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="body-4 text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="initials" className="subheading-4 text-muted-foreground">
              Initials
            </Label>
            <Input id="initials" {...register('initials')} maxLength={10} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jobTitle" className="subheading-4 text-muted-foreground">
              Job Title
            </Label>
            <Input id="jobTitle" {...register('jobTitle', { required: 'Job title is required' })} />
            {errors.jobTitle && (
              <p className="body-4 text-destructive">{errors.jobTitle.message}</p>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="tagline" className="subheading-4 text-muted-foreground">
              Tagline
            </Label>
            <Input
              id="tagline"
              {...register('tagline', { required: 'Tagline is required' })}
              maxLength={500}
            />
            {errors.tagline && <p className="body-4 text-destructive">{errors.tagline.message}</p>}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="bio" className="subheading-4 text-muted-foreground">
              Bio
            </Label>
            <Textarea
              id="bio"
              {...register('bio', { required: 'Bio is required' })}
              rows={4}
              className="resize-none"
            />
            {errors.bio && <p className="body-4 text-destructive">{errors.bio.message}</p>}
          </div>
        </div>
      </section>

      <EditorSection title="Contact">
        <div className="grid gap-4 md:grid-cols-2">
          <PhoneField {...register('phone')} maxLength={50} />
        </div>
      </EditorSection>

      <EditorSection title="Location">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentLocation" className="subheading-4 text-muted-foreground">
              Location
            </Label>
            <Input
              id="currentLocation"
              {...register('currentLocation', { required: 'Location is required' })}
              maxLength={255}
            />
            {errors.currentLocation && (
              <p className="body-4 text-destructive">{errors.currentLocation.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-4">
            <p className="subheading-4 text-foreground">Open to remote</p>
            <Controller
              name="openToRemote"
              control={control}
              render={({ field }) => (
                <Switch
                  id="openToRemote"
                  checked={field.value}
                  disabled={isTogglingFlag || isSubmitting}
                  onCheckedChange={(checked) => {
                    void handleFlagToggle('openToRemote', checked);
                  }}
                />
              )}
            />
          </div>
        </div>
      </EditorSection>

      <section className="pt-6">
        <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-4">
          <p className="subheading-4 text-foreground">Open to opportunities</p>
          <Controller
            name="availabilityStatus"
            control={control}
            render={({ field }) => (
              <Switch
                id="availabilityStatus"
                checked={field.value}
                disabled={isTogglingFlag || isSubmitting}
                onCheckedChange={(checked) => {
                  void handleFlagToggle('availabilityStatus', checked);
                }}
              />
            )}
          />
        </div>
      </section>

      <Button
        type="submit"
        disabled={isSubmitting || isTogglingFlag || !isDirty}
        variant="default"
        isLoading={isSubmitting}
        loadingLabel="Saving..."
      >
        Save changes
      </Button>
    </form>
  );
}

function profileToFormValues(profile: CareerProfileRecord, email: string): BasicInfoFormValues {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '';
  return {
    name,
    initials: profile.initials || '',
    title: profile.title || '',
    jobTitle: profile.headline || '',
    bio: profile.summary || '',
    tagline: profile.tagline || '',
    currentLocation: profile.location || '',
    email,
    phone: profile.phone || '',
    availabilityStatus: profile.availabilityStatus || false,
    openToRemote: profile.openToRemote || false,
  };
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border border-border p-4 rounded">
      <h3 className="subheading-3">{title}</h3>
      {children}
    </section>
  );
}
