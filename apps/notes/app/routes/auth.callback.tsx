import { redirect } from 'react-router';

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get('next');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/notes';

  const getRedirectTarget = (error: string, description: string) => {
    let target = next;
    // Route callback failures to notes root by default.
    if (target === '/') {
      target = '/notes';
    }

    const sep = target.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      error,
      description,
    });
    return `${target}${sep}${params.toString()}`;
  };

  // Handle errors from the provider
  if (errorParam) {
    return redirect(getRedirectTarget(errorParam, errorDescription ?? ''));
  }

  return redirect(next);
}
