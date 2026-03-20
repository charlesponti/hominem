import { type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';

/**
 * The /chat index no longer auto-creates or auto-redirects to the most recent
 * chat. Session creation is always driven by user intent via the Composer
 * floating composer. This route simply redirects authenticated users home and
 * unauthenticated users to the landing page.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerSession(request);
  if (!user) {
    return redirect('/', { headers });
  }
  return redirect('/home', { headers });
}
