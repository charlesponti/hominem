import { redirect } from 'react-router';

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get('next');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (errorParam) {
    const sep = next.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      error: errorParam,
      description: errorDescription ?? '',
    });
    return redirect(`${next}${sep}${params.toString()}`);
  }

  return redirect(next);
}
