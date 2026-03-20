import { redirect } from 'react-router';

export async function loader() {
  const target = `/?error=${encodeURIComponent('Google OAuth linking has been removed')}`;
  return redirect(target);
}
