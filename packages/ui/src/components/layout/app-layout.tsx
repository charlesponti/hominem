import { useNavigation } from 'react-router';

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  backgroundImage?: string;
}

export function AppLayout({ children, navigation, backgroundImage }: AppLayoutProps) {
  const navigationState = useNavigation();
  const isNavigating = navigationState.state !== 'idle';

  return (
    <>
      {/* Page-load progress bar — aria-hidden: purely visual, router state announced by page title change */}
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

      <div className="flex flex-col">
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
          <div className="w-full px-2">{children}</div>
        </main>
      </div>
    </>
  );
}
