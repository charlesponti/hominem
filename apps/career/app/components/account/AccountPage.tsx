import { useAuthClient } from '@ponti-studios/auth/client/provider';
import { useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router';

import { AccountActions } from '~/components/account/AccountActions';
import { AccountDocumentsSection } from '~/components/account/AccountDocumentsSection';
import { BasicInfoForm } from '~/components/account/BasicInfoForm';
import { SocialLinksSection } from '~/components/account/SocialLinksSection';
import type {
  AccountActionResult,
  AccountLoaderData,
  BasicInfoFormValues,
  SocialLinksFormValues,
} from '~/lib/account/types';

export function AccountPage({ loaderData }: { loaderData: AccountLoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const authClient = useAuthClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { user, currentPortfolio, socialLinks, documents } = loaderData;

  const submitAccountAction = async <TData,>(
    formData: FormData,
  ): Promise<AccountActionResult<TData>> => {
    const response = await fetch('/account', {
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

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut();
      navigate('/');
    } catch {
      // Keep the user on the account page if sign-out fails.
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!currentPortfolio) {
      return;
    }

    if (!confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('portfolioId', currentPortfolio.id);

    await submitAccountAction(formData);
    navigate('/work');
  };

  const handleDeleteDocument = async (fileId: string) => {
    const formData = new FormData();
    formData.append('action', 'delete-document');
    formData.append('fileId', fileId);
    const result = await submitAccountAction(formData);
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

    const result = await submitAccountAction<{ imageUrl: string }>(formData);
    revalidator.revalidate();

    return result.data?.imageUrl;
  };

  const handleUpdateSlug = async (slug: string) => {
    if (!currentPortfolio) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'update-slug');
    formData.append('slug', slug);
    formData.append('portfolioId', currentPortfolio.id);

    await submitAccountAction<{ slug: string }>(formData);
    revalidator.revalidate();
  };

  const handleSaveBasics = async (values: BasicInfoFormValues) => {
    const formData = new FormData();
    formData.append('action', 'update-basics');
    formData.append('portfolioData', JSON.stringify(values));

    const result = await submitAccountAction(formData);
    revalidator.revalidate();
    return result;
  };

  const handleSaveSocialLinks = async (values: SocialLinksFormValues) => {
    const formData = new FormData();
    formData.append('action', 'update-social-links');
    formData.append('socialLinksData', JSON.stringify(values));

    const result = await submitAccountAction(formData);
    revalidator.revalidate();
    return result;
  };

  const handleDownloadPdf = async () => {
    if (!currentPortfolio?.slug || !currentPortfolio.isPublic) {
      setPdfError('Portfolio must be public to generate PDF');
      return;
    }

    try {
      setPdfGenerating(true);
      setPdfError(null);

      const portfolioUrl = `${window.location.origin}/p/${currentPortfolio.slug}`;

      const response = await fetch('https://career-worker.fly.dev/trigger-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: portfolioUrl,
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

  return (
    <div className="flex flex-col gap-6">
      <h2 className="heading-2 text-foreground">Account</h2>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <section className="space-y-6">
          <section className="space-y-4">
            <BasicInfoForm
              portfolio={currentPortfolio}
              accountEmail={user.email}
              onSave={handleSaveBasics}
              onImageUpload={handleImageUpload}
              onUpdateSlug={handleUpdateSlug}
            />
          </section>

          <AccountDocumentsSection
            documents={documents}
            onDelete={handleDeleteDocument}
            onConvert={handleConvertDocument}
          />

          <SocialLinksSection socialLinks={socialLinks} onSave={handleSaveSocialLinks} />
        </section>

        <aside className="space-y-8">
          <AccountActions
            canDownloadPdf={currentPortfolio.isPublic}
            isGeneratingPdf={pdfGenerating}
            isSigningOut={isSigningOut}
            onDeletePortfolio={handleDeletePortfolio}
            onDownloadPdf={handleDownloadPdf}
            onSignOut={handleSignOut}
          />

          {pdfError ? (
            <div className="rounded-2xl bg-destructive/10 p-4">
              <p className="subheading-4 text-destructive">PDF export unavailable</p>
              <p className="body-3 mt-1 text-destructive">{pdfError}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
