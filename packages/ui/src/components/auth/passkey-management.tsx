import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Passkey {
  id: string;
  name?: string;
  createdAt?: string;
}

interface PasskeyManagementProps {
  /**
   * Base API URL (e.g. https://api.example.com).
   * Defaults to VITE_PUBLIC_API_URL env var.
   */
  apiUrl?: string;
  /**
   * Called when the user wants to add a new passkey.
   * Should invoke the platform WebAuthn registration flow.
   */
  onAdd: () => Promise<boolean>;
}

/**
 * Passkey management panel — lists registered passkeys, lets users add or
 * delete them. Designed to be embedded in a `/settings/security` page.
 */
export function PasskeyManagement({ apiUrl, onAdd }: PasskeyManagementProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base =
    apiUrl ??
    (typeof import.meta !== 'undefined'
      ? (import.meta.env.VITE_PUBLIC_API_URL as string | undefined)
      : undefined) ??
    '';

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/auth/passkeys`, {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load passkeys');
      const data = (await res.json()) as Passkey[];
      setPasskeys(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load passkeys. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void fetchPasskeys();
  }, [fetchPasskeys]);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    setError(null);
    try {
      const success = await onAdd();
      if (success) {
        await fetchPasskeys();
      } else {
        setError('Passkey registration was cancelled or failed.');
      }
    } catch {
      setError('An error occurred during passkey registration.');
    } finally {
      setAdding(false);
    }
  }, [onAdd, fetchPasskeys]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`${base}/api/auth/passkey/delete`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error('Failed to delete passkey');
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
      } catch {
        setError('Could not delete passkey. Please try again.');
      } finally {
        setDeletingId(null);
      }
    },
    [base],
  );

  return (
    <section aria-labelledby="passkey-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="passkey-heading" className="text-base font-semibold">
            Passkeys
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in without a password using biometrics or a security key.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          aria-label="Add a passkey"
          className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {adding ? 'Adding...' : 'Add passkey'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading passkeys...</p>
      ) : passkeys.length === 0 ? (
        <div className="flex items-center gap-3 border border-dashed border-border p-4 text-sm text-muted-foreground">
          <KeyRound className="w-4 h-4 shrink-0" aria-hidden />
          <span>No passkeys registered. Add one to sign in faster.</span>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Registered passkeys">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between border border-border px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <span className="font-medium">{pk.name ?? 'Passkey'}</span>
                  {pk.createdAt && (
                    <span className="ml-2 text-xs text-muted-foreground">
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
