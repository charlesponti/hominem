import { Outlet } from 'react-router'

export default function ChatRouteLayout() {
  return (
    <div className="-mx-4 flex h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-bottom))] min-h-0 flex-col bg-white sm:-mx-8 md:h-[calc(100dvh-4rem-3rem)] lg:-mx-12">
      <Outlet />
    </div>
  )
}