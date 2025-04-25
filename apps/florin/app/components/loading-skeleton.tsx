export function ResultSkeleton() {
  return (
    <div className="mt-4 p-4 bg-slate-100 rounded-md animate-pulse">
      <div className="h-5 w-20 bg-slate-200 rounded mb-2" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
  )
}
