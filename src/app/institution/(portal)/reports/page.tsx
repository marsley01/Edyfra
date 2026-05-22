"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Calendar, Loader2 } from "lucide-react";

type Report = {
  id: string;
  title: string;
  period: string;
  generated: string;
  type: string;
  pages: number;
  metrics: Record<string, string | number>;
  trend: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionReports, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const data = await getInstitutionReports(membership.institution.id);
          setReports(data as unknown as Report[]);
        }
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#3730A3]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500">View reports based on your institution&apos;s data.</p>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No reports available yet</p>
          <p className="text-xs text-gray-400">Reports will appear once your institution has data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {r.period}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3730A3]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#3730A3]">
                  {r.trend}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                {Object.entries(r.metrics).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="text-sm font-bold text-gray-900">{val}</div>
                    <div className="text-[10px] text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                <span>
                  {r.type} · {r.pages} pages · {r.generated}
                </span>
                <button className="inline-flex items-center gap-1 font-medium text-[#3730A3] hover:underline">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
