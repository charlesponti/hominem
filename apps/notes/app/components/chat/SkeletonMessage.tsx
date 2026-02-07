export function SkeletonMessage() {
  return (
    <div className="flex gap-3">
      <div className="size-8 border border-border rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 border border-border rounded w-24" />
        <div className="space-y-2">
          <div className="h-4 border border-border rounded w-full" />
          <div className="h-4 border border-border rounded w-3/4" />
          <div className="h-4 border border-border rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
