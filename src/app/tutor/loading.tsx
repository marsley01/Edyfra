import { Loader2 } from "lucide-react";

export default function TutorLoading() {
  return (
    <div className="p-3 sm:p-4 space-y-8 animate-pulse font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 w-full max-w-sm">
          <div className="h-10 bg-secondary rounded-xl w-2/3"></div>
          <div className="h-5 bg-secondary rounded-lg w-1/2"></div>
        </div>
        <div className="w-40 h-12 bg-secondary rounded-2xl"></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-secondary rounded-2xl"></div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="h-10 bg-secondary rounded-xl w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-secondary rounded-2xl"></div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <div className="h-64 bg-secondary rounded-[3rem]"></div>
          <div className="h-32 bg-secondary rounded-[2.5rem]"></div>
        </div>
      </div>
    </div>
  );
}
