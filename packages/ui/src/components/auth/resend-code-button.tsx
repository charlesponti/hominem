import { useState, useEffect, useCallback } from 'react';

import { Button } from '../ui/button';

interface ResendCodeButtonProps {
  onResend: () => void;
  isLoading?: boolean;
  cooldownSeconds?: number;
  className?: string;
}

export function ResendCodeButton({
  onResend,
  isLoading = false,
  cooldownSeconds = 30,
  className,
}: ResendCodeButtonProps) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown(cooldown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(() => {
    if (cooldown > 0 || isLoading) return;
    onResend();
    setCooldown(cooldownSeconds);
  }, [cooldown, isLoading, onResend, cooldownSeconds]);

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleResend}
        disabled={cooldown > 0 || isLoading}
        className="text-muted-foreground hover:text-foreground"
      >
        {isLoading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </Button>
    </div>
  );
}
