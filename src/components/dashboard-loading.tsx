export function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="h-5 w-48 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-muted rounded-2xl space-y-4">
            <div className="h-10 w-10 bg-muted-foreground/20 rounded-xl" />
            <div className="h-6 w-24 bg-muted-foreground/20 rounded" />
            <div className="h-10 w-16 bg-muted-foreground/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
