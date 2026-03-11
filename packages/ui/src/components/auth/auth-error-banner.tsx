interface AuthErrorBannerProps {
  error?: string | null | undefined;
  className?: string | undefined;
}

export function AuthErrorBanner({ error, className }: AuthErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      className={`p-3 rounded-[6px] bg-muted border border-destructive ${className ?? ''}`}
      role="alert"
    >
      <span className="text-destructive text-sm font-semibold uppercase">{error}</span>
    </div>
  );
}
