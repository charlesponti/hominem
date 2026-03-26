export function ChatShimmerMessage() {
  return (
    <div className="px-1 py-3 void-anim-shimmer-sweep">
      <div className="space-y-3">
        {/* Avatar + name skeleton */}
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-[var(--color-emphasis-faint)]" />
          <div className="h-2.5 w-14 rounded-full bg-[var(--color-emphasis-faint)]" />
        </div>
        {/* Content lines — staggered widths for organic feel */}
        <div className="space-y-2 pl-7">
          <div className="h-3 w-[92%] rounded-full bg-[var(--color-emphasis-faint)]" />
          <div className="h-3 w-[78%] rounded-full bg-[var(--color-emphasis-faint)]" />
          <div className="h-3 w-[55%] rounded-full bg-[var(--color-emphasis-faint)]" />
        </div>
      </div>
    </div>
  );
}
