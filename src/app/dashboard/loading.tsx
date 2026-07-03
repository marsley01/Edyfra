import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 animate-pulse font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 md:pb-8 border-b border-border">
        <div className="space-y-3 w-full max-w-md">
          <div className="h-10 sm:h-14 bg-secondary rounded-2xl w-3/4"></div>
          <div className="h-6 bg-secondary rounded-xl w-1/2"></div>
        </div>
        <div className="w-full sm:w-40 h-12 sm:h-14 bg-secondary rounded-full"></div>
      </div>

      <div className="h-16 bg-secondary rounded-3xl w-full"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl bg-secondary space-y-6 min-h-[400px]">
          <div className="space-y-2">
            <div className="h-8 bg-secondary-foreground/10 rounded-xl w-1/3"></div>
            <div className="h-4 bg-secondary-foreground/10 rounded-xl w-1/4"></div>
          </div>
          <div className="space-y-4">
            <div className="h-20 bg-secondary-foreground/10 rounded-2xl w-full"></div>
            <div className="h-20 bg-secondary-foreground/10 rounded-2xl w-full"></div>
            <div className="h-20 bg-secondary-foreground/10 rounded-2xl w-full"></div>
          </div>
        </div>
        <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-secondary min-h-[400px]"></div>
      </div>
    </div>
  );
}
