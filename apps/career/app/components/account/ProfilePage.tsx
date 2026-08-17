import { Switch } from '@ponti-studios/ui/forms';
import { Label } from '@ponti-studios/ui/primitives';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { useRevalidator } from 'react-router';

import { AccountDocumentsSection } from '~/components/account/AccountDocumentsSection';
import { BasicInfoForm, profileToFormValues } from '~/components/account/BasicInfoForm';
import { CertificationsSection } from '~/components/account/CertificationsSection';
import { SocialLinksSection } from '~/components/account/SocialLinksSection';
import { FormErrorAlert } from '~/components/FormErrorAlert';
import { SaveBar } from '~/components/SaveBar';
import { SlugEditor } from '~/components/SlugEditor';
import type {
  AccountActionResult,
  BasicInfoFormValues,
  CertificationFormValues,
  ProfileDetailsFormValues,
  ProfileLoaderData,
  SocialLinksFormValues,
} from '~/lib/account/types';

import { UploadResumeForm } from '../UploadResumeForm';
import { ActionButtonRow } from './ActionButtonRow';

const SOCIAL_KEYS: readonly string[] = [
  'github',
  'linkedin',
  'twitter',
  'website',
] satisfies (keyof SocialLinksFormValues)[];

export function ProfilePage({ loaderData }: { loaderData: ProfileLoaderData }) {
  const revalidator = useRevalidator();
  const { user, currentProfile, socialLinks, documents, certifications } = loaderData;
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [isPublic, setIsPublic] = useState(currentProfile.isPublic);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const lockedEmail = user.email || '';
  const detailsDefaultValues = (): ProfileDetailsFormValues => ({
    ...profileToFormValues(currentProfile, lockedEmail),
    github: socialLinks?.github || '',
    linkedin: socialLinks?.linkedin || '',
    twitter: socialLinks?.twitter || '',
    website: socialLinks?.website || '',
  });

  const detailsForm = useForm<ProfileDetailsFormValues>({
    defaultValues: detailsDefaultValues(),
  });
  const {
    handleSubmit: handleDetailsSubmit,
    reset: resetDetails,
    formState: { isDirty: detailsDirty, isSubmitting: detailsSubmitting, dirtyFields },
  } = detailsForm;

  useEffect(() => {
    resetDetails(detailsDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile, socialLinks, lockedEmail, resetDetails]);

  const submitProfileAction = async <TData,>(
    formData: FormData,
  ): Promise<AccountActionResult<TData>> => {
    const response = await fetch('/profile', {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    const result = contentType?.includes('application/json')
      ? ((await response.json()) as AccountActionResult<TData>)
      : {
          success: response.ok,
          error: response.ok ? undefined : await response.text(),
        };

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Request failed');
    }

    return result;
  };

  const handleUpdateSlug = async (slug: string) => {
    const formData = new FormData();
    formData.append('action', 'update-slug');
    formData.append('slug', slug);
    formData.append('profileId', currentProfile.id);

    await submitProfileAction<{ slug: string }>(formData);
    revalidator.revalidate();
  };

  const handleToggleVisibility = async (checked: boolean) => {
    const previous = isPublic;
    setIsPublic(checked);
    setIsTogglingVisibility(true);

    const formData = new FormData();
    formData.append('action', 'update-visibility');
    formData.append('isPublic', String(checked));

    try {
      const result = await submitProfileAction<{ isPublic: boolean }>(formData);
      if (result.success === false) {
        setIsPublic(previous);
      } else {
        revalidator.revalidate();
      }
    } catch {
      setIsPublic(previous);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentProfile.slug || !isPublic) {
      setPdfError('Make your profile public before generating a PDF.');
      return;
    }

    try {
      setPdfGenerating(true);
      setPdfError(null);

      const profileUrl = `${window.location.origin}/p/${currentProfile.slug}`;

      const response = await fetch('https://career-worker.fly.dev/trigger-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: profileUrl,
          ownerUserid: user.id,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        pdfUrl?: string;
        message?: string;
      };

      if (result.success && result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        return;
      }

      setPdfError(result.message || 'Failed to generate PDF');
    } catch {
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDeleteDocument = async (fileId: string) => {
    const formData = new FormData();
    formData.append('action', 'delete-document');
    formData.append('fileId', fileId);
    const result = await submitProfileAction(formData);
    if (result.success === false) {
      throw new Error(result.error || 'Failed to delete file');
    }
    revalidator.revalidate();
  };

  const handleConvertDocument = async (fileId: string) => {
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('replaceExisting', 'true');
    const response = await fetch('/api/resume/convert', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      throw new Error(payload?.error || 'Conversion failed');
    }
    revalidator.revalidate();
  };

  const handleImageUpload = async (croppedImageBlob: Blob) => {
    const formData = new FormData();
    formData.append('image', croppedImageBlob, 'profile-image.jpg');
    formData.append('action', 'upload-profile-image');

    const result = await submitProfileAction<{ imageUrl: string }>(formData);
    revalidator.revalidate();

    return result.data?.imageUrl;
  };

  const handleSaveBasics = async (values: BasicInfoFormValues) => {
    const formData = new FormData();
    formData.append('action', 'update-basics');
    formData.append('profileData', JSON.stringify(values));

    const result = await submitProfileAction(formData);
    revalidator.revalidate();
    return result;
  };

  const handleSaveSocialLinks = async (values: SocialLinksFormValues) => {
    const formData = new FormData();
    formData.append('action', 'update-social-links');
    formData.append('socialLinksData', JSON.stringify(values));

    const result = await submitProfileAction(formData);
    revalidator.revalidate();
    return result;
  };

  const onSaveDetails: SubmitHandler<ProfileDetailsFormValues> = async (values) => {
    setDetailsError(null);

    const dirtyKeys = Object.keys(dirtyFields);
    const socialChanged = dirtyKeys.some((key) => SOCIAL_KEYS.includes(key));
    const basicsChanged = dirtyKeys.some((key) => !SOCIAL_KEYS.includes(key));

    try {
      const results = await Promise.all([
        basicsChanged ? handleSaveBasics(values) : null,
        socialChanged
          ? handleSaveSocialLinks({
              github: values.github,
              linkedin: values.linkedin,
              twitter: values.twitter,
              website: values.website,
            })
          : null,
      ]);

      const failed = results.find((result) => result && result.success === false);
      if (failed) {
        setDetailsError(failed.error || "We couldn't save your changes. Try again.");
        return;
      }

      resetDetails(values);
    } catch (error) {
      setDetailsError(
        error instanceof Error ? error.message : "We couldn't save your changes. Try again.",
      );
    }
  };

  const handleAddCertification = async (values: CertificationFormValues) => {
    const formData = new FormData();
    formData.append('action', 'add-certification');
    formData.append('name', values.name);
    formData.append('issuingOrganization', values.issuingOrganization);
    if (values.issueDate) formData.append('issueDate', values.issueDate);

    const result = await submitProfileAction(formData);
    revalidator.revalidate();
    return result;
  };

  const handleDeleteCertification = async (id: string) => {
    const formData = new FormData();
    formData.append('action', 'delete-certification');
    formData.append('id', id);

    const result = await submitProfileAction(formData);
    if (result.success === false) {
      throw new Error(result.error || 'Failed to remove certification');
    }
    revalidator.revalidate();
  };

  return (
    <div className="space-y-12 mx-auto max-w-3xl">
      <header className="flex justify-between">
        <h2 className="text-4xl italic font-serif text-foreground">
          Profile
          <p className="text-sm text-muted-foreground/25">
            Last Updated: {new Date(currentProfile.updatedAt).toLocaleDateString('en-US')}
          </p>
        </h2>
        <ActionButtonRow
          icon={Download}
          onClick={() => handleDownloadPdf()}
          variant="outline"
          disabled={pdfGenerating}
          isLoading={pdfGenerating}
          loadingLabel="Generating PDF..."
          helper={!isPublic ? 'Make your profile public to generate a PDF.' : undefined}
        />
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="space-y-4 border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="profile-slug">Profile URL</Label>
              <p className="text-sm text-muted-foreground">
                {isPublic
                  ? 'Anyone with the link can view your profile at this URL.'
                  : "Private — only you can see this. Turn it on to share it."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <span className="text-sm text-muted-foreground">
                {isPublic ? 'Public' : 'Private'}
              </span>
              <Switch
                checked={isPublic}
                disabled={isTogglingVisibility}
                onCheckedChange={handleToggleVisibility}
                aria-label="Toggle profile visibility"
              />
            </div>
          </div>
          <SlugEditor
            profileId={currentProfile.id}
            initialSlug={currentProfile.slug || ''}
            liveUrl={isPublic && currentProfile.slug ? `/p/${currentProfile.slug}` : null}
            onSave={handleUpdateSlug}
          />
        </section>

        <section className="space-y-4">
          <UploadResumeForm
            mode="replace"
            onUploadStart={() => undefined}
            onUploadComplete={() => revalidator.revalidate()}
            onUploadError={() => undefined}
          />

          {pdfError ? (
            <div className="rounded-2xl bg-destructive/10 p-4">
              <p className="subheading-4 text-destructive">PDF export unavailable</p>
              <p className="body-3 mt-1 text-destructive">{pdfError}</p>
            </div>
          ) : null}
        </section>

        <FormProvider {...detailsForm}>
          <form onSubmit={handleDetailsSubmit(onSaveDetails)} className="space-y-6">
            <FormErrorAlert title="Profile changes weren't saved" message={detailsError} />

            <BasicInfoForm profile={currentProfile} onImageUpload={handleImageUpload} />

            <AccountDocumentsSection
              documents={documents}
              onDelete={handleDeleteDocument}
              onConvert={handleConvertDocument}
            />

            <SocialLinksSection />

            <SaveBar dirty={detailsDirty} isSaving={detailsSubmitting} />
          </form>
        </FormProvider>

        <CertificationsSection
          certifications={certifications}
          onAdd={handleAddCertification}
          onDelete={handleDeleteCertification}
        />
      </div>
    </div>
  );
}
