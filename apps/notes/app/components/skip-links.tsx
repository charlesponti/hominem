import { useCallback } from 'react';

interface SkipLinksProps {
  className?: string;
}

export function SkipLinks({ className = '' }: SkipLinksProps) {
  const skipToMain = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const mainContent = document.querySelector('main, [role="main"], #main-content');
    if (mainContent instanceof HTMLElement) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView({ block: 'start' });
    }
  }, []);

  const skipToNavigation = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const navigation = document.querySelector('nav, [role="navigation"], header');
    if (navigation instanceof HTMLElement) {
      const firstFocusable = navigation.querySelector(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
        firstFocusable.scrollIntoView({ block: 'center' });
      }
    }
  }, []);

  const skipToActions = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const actionButtons = document.querySelectorAll('[data-copy-button]');
    if (actionButtons.length > 0 && actionButtons[0] instanceof HTMLElement) {
      actionButtons[0].focus();
      actionButtons[0].scrollIntoView({ block: 'center' });
    }
  }, []);

  return (
    <div className={`sr-only focus-within:not-sr-only ${className}`}>
      <div className="fixed top-0 left-0 z-50 p-2 border-2 border-border">
        <h2 className="text-sm font-semibold mb-2">Skip to:</h2>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={skipToMain}
              onKeyDown={(e) => e.key === 'Enter' && skipToMain(e)}
              className="text-sm text-foreground hover:text-foreground/80 underline focus:outline-none focus:ring-2 focus:ring-accent focus:"
            >
              Main content
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={skipToNavigation}
              onKeyDown={(e) => e.key === 'Enter' && skipToNavigation(e)}
              className="text-sm text-foreground hover:text-foreground/80 underline focus:outline-none focus:ring-2 focus:ring-accent focus:"
            >
              Navigation
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={skipToActions}
              onKeyDown={(e) => e.key === 'Enter' && skipToActions(e)}
              className="text-sm text-foreground hover:text-foreground/80 underline focus:outline-none focus:ring-2 focus:ring-accent focus:"
            >
              Copy actions
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
