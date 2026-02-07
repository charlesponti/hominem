import { memo } from 'react';

import { cn } from '~/lib/utils';

export const FileUploadStatusBadge = memo(function FileUploadStatusBadge({
  status,
}: {
  status?: string | undefined;
}) {
  if (!status) return null;

  const getStatusConfig = (status: string): { bg: string; text: string; label: string } => {
    const configs = {
      uploading: { bg: 'bg-muted', text: 'text-foreground', label: 'Uploading' },
      processing: { bg: 'bg-muted', text: 'text-foreground', label: 'Processing' },
      queued: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Queued' },
      done: { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Complete' },
      error: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Error' },
    } as const;

    return (
      configs[status as keyof typeof configs] || {
        bg: 'bg-muted',
        text: 'text-foreground',
        label: status,
      }
    );
  };

  const config = getStatusConfig(status);

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
});
