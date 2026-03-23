export function ChatShimmerMessage() {
  return (
    <div className="animate-pulse rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
      <div className="mb-3 h-3 w-20 rounded bg-foreground/10" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-foreground/10" />
        <div className="h-3 w-5/6 rounded bg-foreground/10" />
        <div className="h-3 w-2/3 rounded bg-foreground/10" />
      </div>
    </div>
  )
}
