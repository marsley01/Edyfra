"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Download, Loader2 } from "lucide-react";

type BillingData = {
  plan: string;
  planName: string;
  members: number;
  invoices: { id: string; date: string; amount: string; status: string; plan: string }[];
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionBilling, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const result = await getInstitutionBilling(membership.institution.id);
          setData(result as BillingData);
        }
      } catch {
        setData(null);
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

  if (!data) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <CreditCard className="mb-3 h-10 w-10 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">Billing information not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500">Manage your subscription and view invoices.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CreditCard className="h-4 w-4 text-[#3730A3]" />
          Current Plan
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{data.planName} Plan</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{data.members} member{data.members !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
        <div className="mt-4 space-y-2">
          {data.invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>
          ) : (
            data.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.id}</div>
                  <div className="text-xs text-gray-400">{inv.date} · {inv.plan}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-900">{inv.amount}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    inv.status === "paid"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
