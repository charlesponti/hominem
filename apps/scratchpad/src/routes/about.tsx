import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="about-page">
      <h2>About This App</h2>
      <p>This is a simple application built with React, Vite, and TanStack Router.</p>
    </div>
  )
}