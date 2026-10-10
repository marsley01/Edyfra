export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
        <div className="h-7 w-64 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-gray-100 bg-white" />
    </div>
  );
}
