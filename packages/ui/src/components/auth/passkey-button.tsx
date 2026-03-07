import { KeyRound } from 'lucide-react';

import { Button } from '../ui/button';

interface PasskeyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function PasskeyButton({
  onClick,
  disabled = false,
  isLoading = false,
  className,
}: PasskeyButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
    >
      <KeyRound className="w-4 h-4 mr-2" />
      {isLoading ? 'Signing in...' : 'Use a passkey'}
    </Button>
  );
}
