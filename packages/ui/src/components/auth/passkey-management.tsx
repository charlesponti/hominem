import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '../ui/button';

interface Passkey {
  id: string;
  name?: string;
  createdAt?: string;
}

interface PasskeyManagementProps {
  /**
   * List of registered passkeys to display.
   * Pass undefined while loading.
   */
  passkeys?: Passkey[] | undefined;
  /**
   * Whether the passkeys list is currently loading.
   */
  isLoading?: boolean | undefined;
  /**
   * Error message to display, if any.
   */
  error?: string | null | undefined;
  /**
   * Called when the user wants to add a new passkey.
   * Should invoke the platform WebAuthn registration flow.
   * Returns true on success, false on cancellation/failure.
   */
  onAdd: () => Promise<boolean>;
  /**
   * Called when the user wants to delete a passkey.
   * Returns true on success, false on failure.
   */
  onDelete: (id: string) => Promise<boolean>;
}

/**
 * Passkey management panel — lists registered passkeys, lets users add or
 * delete them. Designed to be embedded in a `/settings/security` page.
 *
 * Data fetching is the responsibility of the parent component.
 */
export function PasskeyManagement({
  passkeys: passkeysProp,
  isLoading = false,
  error: externalError,
  onAdd,
  onDelete,
}: PasskeyManagementProps) {
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const passkeys = passkeysProp ?? [];
  const error = externalError ?? actionError;

  const handleAdd = useCallback(async () => {
    setAdding(true);
    setActionError(null);
    try {
      const success = await onAdd();
      if (!success) {
        setActionError('Passkey registration was cancelled or failed.');
      }
    } catch {
      setActionError('An error occurred during passkey registration.');
    } finally {
      setAdding(false);
    }
  }, [onAdd]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setActionError(null);
      try {
        const success = await onDelete(id);
        if (!success) throw new Error('Failed to delete passkey');
      } catch {
        setActionError('Could not delete passkey. Please try again.');
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete],
  );

  return (
    <section aria-labelledby="passkey-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="passkey-heading" className="subheading-4 text-text-primary">
            Passkeys
          </h2>
          <p className="body-3 text-text-secondary">
            Sign in without a password using biometrics or a security key.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={adding}
          aria-label="Add a passkey"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {adding ? 'Adding...' : 'Add passkey'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading passkeys...</p>
      ) : passkeys.length === 0 ? (
        <div className="flex items-center gap-3 border border-dashed border-default p-4 text-sm text-text-secondary">
          <KeyRound className="w-4 h-4 shrink-0" aria-hidden />
          <span>No passkeys registered. Add one to sign in faster.</span>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Registered passkeys">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between border border-default px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden />
                <div>
                  <span className="font-medium">{pk.name ?? 'Passkey'}</span>
                  {pk.createdAt && (
                    <span className="ml-2 text-xs text-text-tertiary">
                      Added {new Date(pk.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(pk.id)}
                disabled={deletingId === pk.id}
                aria-label={`Remove passkey ${pk.name ?? pk.id}`}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
