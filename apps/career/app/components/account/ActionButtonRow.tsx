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
  label?: string;
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
        <Icon className="size-4" />
        {label ?? null}
      </Button>
      {helper ? <p className="text-sm px-1 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
