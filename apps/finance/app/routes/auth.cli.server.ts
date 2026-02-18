import { type LoaderFunctionArgs, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri');

  if (!redirectUri) {
    throw new Response('Missing redirect_uri parameter', { status: 400 });
  }

  const cliToken = process.env.CLI_AUTH_TOKEN;
  if (!cliToken) {
    throw new Response('CLI authentication is not configured', { status: 503 });
  }

  return redirect(`${redirectUri}?token=${cliToken}`);
}
