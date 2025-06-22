import { Outlet } from 'react-router'

export default function ChatLayout() {
  return (
    <div className="bg-background flex h-screen">
      <Outlet />
    </div>
  )
}
