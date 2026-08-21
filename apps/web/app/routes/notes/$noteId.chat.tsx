import { type LoaderFunctionArgs, redirect } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const { noteId } = params;

  if (!noteId) {
    return redirect('/notes');
  }

  return redirect(`/chat?noteId=${noteId}`);
}
