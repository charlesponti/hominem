import { useNavigation } from 'react-router';

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
}

export function AppLayout({
  children,
  navigation,
}: AppLayoutProps) {
  const navigationState = useNavigation();
  const isNavigating = navigationState.state !== 'idle';

  return (
    <>
      {isNavigating && (
        <div
          className="fixed top-0 left-0 w-full z-50"
          aria-label="Navigation progress"
          role="status"
        >
          <div className="h-0.5 bg-foreground/40 animate-pulse" />
        </div>
      )}

      <div className="flex min-h-dvh flex-col bg-background">
        {navigation}

        <main
          id="main-content"
          className="flex-1 mt-14 md:mt-16 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-12"
        >
          <div className="w-full max-w-5xl px-4 sm:px-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
