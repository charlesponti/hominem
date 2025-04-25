import { useUser } from '@clerk/react-router'
import { Navigate } from 'react-router'

export default function Tasks() {
  const { isLoaded, user } = useUser()

  // Implement your tasks page functionality here
  // This is a protected route

  if (isLoaded && !user?.id) {
    return <Navigate to="/sign-in" replace />
  }

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>

      {/* Your tasks implementation goes here */}
      <div className="bg-yellow-100 p-4 rounded-md border border-yellow-300">
        <p className="text-yellow-800">
          Tasks functionality is being implemented. This page demonstrates the pattern for protected
          routes in React Router 7.
        </p>
      </div>
    </div>
  )
}
