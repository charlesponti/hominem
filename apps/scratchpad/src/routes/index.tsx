import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="home-page">
      <h2>Welcome to the Scratchpad App</h2>
      <p>This is a React application using Vite and TanStack Router</p>
    </div>
  )
}