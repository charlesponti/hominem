import type { ReactNode } from 'react';
import { useRouteLoaderData } from 'react-router';

import { AccountMenu } from '~/components/account-menu';
import { ChatNavigation } from '~/components/chat-navigation';
import type { User } from '~/lib/auth.server';

type AuthenticatedLayoutData = { user: User | null };

export function RouteHeader({
  children,
  showNewChat = true,
}: {
  children?: ReactNode;
  showNewChat?: boolean;
}) {
  const layoutData = useRouteLoaderData('routes/layout') as AuthenticatedLayoutData | undefined;
  if (!layoutData?.user) return null;

  return (
    <header className="route-header flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-3 pt-safe-area-inset-top">
      <ChatNavigation showNewChat={showNewChat} />
      {children ? <div className="min-w-0 flex-1">{children}</div> : <div className="flex-1" />}
      <AccountMenu user={layoutData.user} />
    </header>
  );
}
