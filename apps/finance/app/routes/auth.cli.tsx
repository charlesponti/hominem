import { type LoaderFunctionArgs } from 'react-router';

import { serverEnv } from '~/lib/env';

export async function loader({ request }: LoaderFunctionArgs) {
  void request;
  void serverEnv.VITE_PUBLIC_API_URL;
  throw new Response('OAuth CLI authorization has been removed.', { status: 410 });
}

export default function AuthRoute() {
  return (
    <div>
      <h1>Authenticating...</h1>
      <p>You should be redirected for authentication, then back to the CLI.</p>
    </div>
  );
}
