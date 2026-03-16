import { Outlet } from 'react-router';

export default function ChatRouteLayout() {
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <Outlet />
    </div>
  );
}
