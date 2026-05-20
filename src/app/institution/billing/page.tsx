"use client";

import { CreditCard, CheckCircle2, Download, ArrowUpRight } from "lucide-react";

const invoices = [
  { id: "INV-2026-001", date: "May 1, 2026", amount: "KES 45,000", status: "paid", plan: "Premium Monthly" },
  { id: "INV-2026-002", date: "Apr 1, 2026", amount: "KES 45,000", status: "paid", plan: "Premium Monthly" },
  { id: "INV-2026-003", date: "Mar 1, 2026", amount: "KES 45,000", status: "paid", plan: "Premium Monthly" },
  { id: "INV-2026-004", date: "Feb 1, 2026", amount: "KES 45,000", status: "paid", plan: "Premium Monthly" },
];

export default function BillingPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500">Manage your subscription and view invoices.</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CreditCard className="h-4 w-4 text-[#3730A3]" />
          Current Plan
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">Premium Plan</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">KES 45,000 / month · Up to 2,000 students · Unlimited sessions</p>
          </div>
          <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Upgrade
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Students", value: "1,284 / 2,000" },
            { label: "Tutors", value: "18 / 25" },
            { label: "Storage Used", value: "2.4 GB / 10 GB" },
            { label: "Sessions/Month", value: "347 / Unlimited" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-100 p-3 text-center">
              <div className="text-xs font-medium text-gray-500">{s.label}</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Payment Method</h3>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
              VISA
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Visa ending in 4242</div>
              <div className="text-xs text-gray-400">Expires 12/2028</div>
            </div>
          </div>
          <button className="text-xs font-medium text-gray-500 hover:text-gray-700">Update</button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
        <div className="mt-4 space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.id}</div>
                  <div className="text-xs text-gray-400">{inv.date} · {inv.plan}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">{inv.amount}</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                  Paid
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
