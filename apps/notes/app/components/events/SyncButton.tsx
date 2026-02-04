import { useState } from 'react';

import { cn } from '~/lib/utils';

interface SyncButtonProps {
  onSync: () => Promise<void>;
  disabled?: boolean;
}

export default function SyncButton({ onSync, disabled = false }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing || disabled) return;

    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={disabled || isSyncing}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 border border-border',
        {
          'bg-muted text-muted-foreground cursor-not-allowed': disabled || isSyncing,
          'bg-card text-foreground cursor-pointer hover:bg-accent': !(disabled || isSyncing),
        },
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isSyncing ? 'animate-spin' : ''}
      >
        <title>Sync Google Calendar</title>
        <path
          d="M21.5 2V8M21.5 8H15.5M21.5 8L18.5 5C16.5 3 13.5 2 10.5 2C5 2 0.5 6.5 0.5 12C0.5 17.5 5 22 10.5 22C15.5 22 19.5 18.5 20.5 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isSyncing ? 'Syncing...' : 'Sync Google Calendar'}
    </button>
  );
}
