import { isRouteErrorResponse } from 'react-router'
import Header from './header'

interface ErrorBoundaryProps {
  error: unknown
}

export default function ErrorBoundary({ error }: ErrorBoundaryProps) {
  // Log error for debugging (even in production, but only to console)
  if (error instanceof Error) {
    console.error('ErrorBoundary caught an error:', error)
  } else {
    console.error('ErrorBoundary caught an error:', error)
  }

  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : `Error ${error.status}`
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details

    if (error.status === 401) {
      details = 'You need to sign in to access this page.'
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  } else if (error instanceof Error) {
    // In production, still show the error message but not the stack
    details = error.message
  }

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="h-full w-full flex flex-col sm:max-w-3xl px-2">
        <Header />
        <main className="pt-16 p-4 container mx-auto">
          <h1 className="text-3xl font-bold mb-4">{message}</h1>
          <p className="mb-4">{details}</p>
          {stack && (
            <pre className="w-full p-4 overflow-x-auto bg-slate-100 rounded text-sm">
              <code>{stack}</code>
            </pre>
          )}
        </main>
      </div>
    </div>
  )
}
