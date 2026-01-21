import { type LoaderFunctionArgs, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri');

  if (!redirectUri) {
    throw new Response('Missing redirect_uri parameter', { status: 400 });
  }

  // In a real application, you would perform actual authentication here.
  // This is a placeholder for demonstration purposes.
  const dummyToken = 'your_super_secret_cli_token_12345';

  // Redirect back to the CLI with the token
  return redirect(`${redirectUri}?token=${dummyToken}`);
}
