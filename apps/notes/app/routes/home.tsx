import { getServerSession } from '@hominem/auth/server'
import { data, Link, type LoaderFunctionArgs, redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerSession(request)

  if (user) {
    return redirect('/notes', { headers })
  }

  return data({}, { headers })
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
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors"
        >
          Open Animus
        </Link>
      </div>
    </div>
  )
}
