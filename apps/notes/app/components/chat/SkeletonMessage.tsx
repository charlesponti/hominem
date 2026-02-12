export function SkeletonMessage() {
  return (
    <div className="flex gap-3">
      <div className="size-8 border border-border shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 border border-border w-24" />
        <div className="space-y-2">
          <div className="h-4 border border-border w-full" />
          <div className="h-4 border border-border w-3/4" />
          <div className="h-4 border border-border w-1/2" />
        </div>
      </div>
    </div>
  );
}
