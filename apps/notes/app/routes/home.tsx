import { data, Link, type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerSession(request);

  if (user) {
    return redirect('/notes', { headers });
  }

  return data({}, { headers });
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-6">ANIMUS</h1>
      <p className="text-xl mb-8 max-w-2xl">
        Notes for execution. Organize thoughts, tasks, and data without ceremony.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/notes" className="px-6 py-3 bg-primary text-primary-foreground void-anim-breezy">
          ENTER
        </Link>
      </div>
    </div>
  );
}
