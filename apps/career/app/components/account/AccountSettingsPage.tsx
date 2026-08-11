import { useState } from 'react';
import { useNavigate } from 'react-router';

import { AccountActions } from '~/components/account/AccountActions';
import { EmailField } from '~/components/EmailField';
import type { AccountActionResult, AccountSettingsLoaderData } from '~/lib/account/types';
import { authClient } from '~/lib/auth-client';

export function AccountSettingsPage({ loaderData }: { loaderData: AccountSettingsLoaderData }) {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { user, currentProfile } = loaderData;

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

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('profileId', currentProfile.id);

    await submitAccountAction(formData);
    navigate('/work');
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h2 className="heading-2 text-foreground">Account</h2>
        <p className="body-3 text-muted-foreground">
          Sign-in, visibility, and administration for your career account.
        </p>
      </div>

      <div className="space-y-8 rounded-xl border border-border bg-card p-6">
        <section className="space-y-4">
          <h3 className="heading-4">Identity</h3>
          <EmailField id="account-email" value={user.email ?? ''} disabled readOnly />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <AccountActions
            isSigningOut={isSigningOut}
            onDeleteProfile={handleDeleteProfile}
            onSignOut={handleSignOut}
          />
        </section>
      </div>
    </div>
  );
}
