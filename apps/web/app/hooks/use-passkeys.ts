import { useQuery } from '@tanstack/react-query';

interface Passkey {
  id: string;
  name?: string;
  createdAt?: string;
}

async function fetchPasskeys(): Promise<Passkey[]> {
  const base =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_API_URL) ||
    process.env.VITE_PUBLIC_API_URL ||
    '';

  const res = await fetch(`${base}/api/auth/passkeys`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
  });

  if (!res.ok) throw new Error('Failed to fetch passkeys');
  const data = (await res.json()) as Passkey[];
  return Array.isArray(data) ? data : [];
}

export function usePasskeys() {
  return useQuery<Passkey[], Error>({
    queryKey: ['passkeys'],
    queryFn: fetchPasskeys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useHasPasskeys() {
  const { data, isLoading } = usePasskeys();

  if (isLoading) return undefined;
  if (data === undefined) return undefined;
  return data.length > 0;
}
