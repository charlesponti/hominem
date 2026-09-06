import type { CareerProfileRecord } from '@hominem/db/career';
import { Input, Switch, Textarea } from '@ponti-studios/ui/forms';
import { Controller, useFormContext } from 'react-hook-form';

import { PhoneField } from '~/components/PhoneField';
import { ProfileImageUpload } from '~/components/ProfileImageUpload';
import type { ProfileDetailsFormValues } from '~/lib/account/types';

// Hooks into the page-level react-hook-form context (not its own form) so
// this fieldset shares dirty state and the save action with ProfilePage's SaveBar.
export function BasicInfoForm({
  profile,
  onImageUpload,
}: {
  profile: CareerProfileRecord;
  onImageUpload: (croppedImageBlob: Blob) => Promise<string | undefined>;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProfileDetailsFormValues>();

  return (
    <section className="space-y-4 border rounded-2xl p-4">
      <section className="space-y-5">
        <ProfileImageUpload
          compact
          currentImageUrl={profile.profileImageUrl || undefined}
          onUpload={onImageUpload}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="name">Full Name</label>
            <Input id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="initials">Initials</label>
            <Input id="initials" {...register('initials')} maxLength={10} />
          </div>
          <div className="space-y-1">
            <label htmlFor="jobTitle">Job Title</label>
            <Input id="jobTitle" {...register('jobTitle', { required: 'Job title is required' })} />
            {errors.jobTitle && (
              <p className="text-sm text-destructive">{errors.jobTitle.message}</p>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="tagline">Tagline</label>
            <Input
              id="tagline"
              {...register('tagline', { required: 'Tagline is required' })}
              maxLength={500}
            />
            {errors.tagline && <p className="text-sm text-destructive">{errors.tagline.message}</p>}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="bio">Bio</label>
            <Textarea
              id="bio"
              {...register('bio', { required: 'Bio is required' })}
              rows={4}
              className="resize-none"
            />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
          </div>
        </div>
      </section>

      <PhoneField {...register('phone')} maxLength={50} />

      <div className="space-y-4">
        <div>
          <label htmlFor="currentLocation">Location</label>
          <Input
            id="currentLocation"
            {...register('currentLocation', { required: 'Location is required' })}
            maxLength={255}
          />
          {errors.currentLocation && (
            <p className="text-sm text-destructive">{errors.currentLocation.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between border rounded-2xl bg-muted/40 px-4 py-2 max-w-fit gap-4">
          <p className="subheading-4 text-foreground">Open to remote</p>
          <Controller
            name="openToRemote"
            control={control}
            render={({ field }) => (
              <Switch id="openToRemote" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between border rounded-2xl bg-muted/40 px-4 py-2 max-w-fit gap-4">
          <p className="subheading-4 text-foreground">Open to opportunities</p>
          <Controller
            name="availabilityStatus"
            control={control}
            render={({ field }) => (
              <Switch
                id="availabilityStatus"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </section>
    </section>
  );
}

export function profileToFormValues(
  profile: CareerProfileRecord,
  email: string,
): Pick<
  ProfileDetailsFormValues,
  | 'email'
  | 'name'
  | 'availabilityStatus'
  | 'bio'
  | 'currentLocation'
  | 'initials'
  | 'jobTitle'
  | 'openToRemote'
  | 'phone'
  | 'tagline'
  | 'title'
> {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '';
  return {
    email,
    name,
    availabilityStatus: profile.availabilityStatus || false,
    bio: profile.summary || '',
    currentLocation: profile.location || '',
    initials: profile.initials || '',
    jobTitle: profile.headline || '',
    openToRemote: profile.openToRemote || false,
    phone: profile.phone || '',
    tagline: profile.tagline || '',
    title: profile.title || '',
  };
}
