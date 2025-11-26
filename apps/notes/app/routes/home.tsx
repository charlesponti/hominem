import { type LoaderFunctionArgs, redirect } from 'react-router'
import { Link } from 'react-router'
import { getServerSession } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getServerSession(request)

  if (user) {
    return redirect('/notes')
  }

  return {}
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to Animus</h1>
      <p className="text-xl mb-8 max-w-2xl">
        A simple, powerful notes application for organizing your thoughts, tasks, and ideas.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/notes"
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Open Animus
        </Link>
      </div>
    </div>
  )
}
