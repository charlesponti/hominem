import { Button } from '@ponti-studios/ui/primitives';
import type { Edit } from 'lucide-react';

export function ActionButtonRow({
  icon: Icon,
  label,
  helper,
  onClick,
  variant = 'outline',
  disabled = false,
  destructive = false,
  isLoading = false,
  loadingLabel,
}: {
  icon: typeof Edit;
  label: string;
  helper?: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  destructive?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        onClick={() => onClick()}
        variant={destructive ? 'destructive' : variant}
        disabled={disabled}
        isLoading={isLoading}
        loadingLabel={loadingLabel}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {helper ? <p className="body-4 px-1 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
