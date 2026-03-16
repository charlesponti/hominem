import { useNavigation } from 'react-router';

import { SidebarInset, SidebarProvider } from '../ui/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  sidebar?: React.ReactNode;
  backgroundImage?: string;
  contentMode?: 'default' | 'full-bleed';
}

export function AppLayout({
  children,
  navigation,
  sidebar,
  backgroundImage,
  contentMode = 'default',
}: AppLayoutProps) {
  const navigationState = useNavigation();
  const isNavigating = navigationState.state !== 'idle';

  // If sidebar is provided, render in ChatGPT sidebar layout mode
  if (sidebar) {
    return (
      <>
        {isNavigating && (
          <div className="fixed top-0 left-0 w-full z-50" aria-hidden="true">
            <div className="h-0.5 bg-foreground/30 animate-pulse" />
          </div>
        )}

        {backgroundImage && (
          <div
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${backgroundImage}')` }}
          />
        )}

        <SidebarProvider>
          {sidebar}
          <SidebarInset className="bg-background">
            <main
              id="main-content"
              className={
                contentMode === 'full-bleed'
                  ? 'flex flex-col min-h-svh w-full'
                  : 'flex flex-col min-h-svh w-full px-4 sm:px-8 lg:px-12'
              }
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </>
    );
  }

  // Legacy layout: top-header based (for pages that haven't migrated yet)
  return (
    <>
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50" aria-hidden="true">
          <div className="h-0.5 bg-foreground/40 animate-pulse" />
        </div>
      )}

      {backgroundImage && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        />
      )}

      <div className="flex min-h-dvh flex-col bg-background">
        {navigation}

        {/*
          mt-14/md:mt-16 = header height (56px mobile, 64px desktop).
          pb-[calc(56px+env(safe-area-inset-bottom))] on mobile = tab bar clearance.
          id="main-content" = skip-link target (WCAG 2.4.1).
        */}
        <main
          id="main-content"
          className="flex-1 mt-14 md:mt-16 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-12"
        >
          <div
            className={
              contentMode === 'full-bleed' ? 'w-full' : 'w-full max-w-5xl px-4 sm:px-8 lg:px-12'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
