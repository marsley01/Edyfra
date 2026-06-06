"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { decideInstitutionApplication } from "@/app/actions/institution-founder";

type AppRow = {
  id: string;
  code: string | null;
  name: string;
  schoolType: string | null;
  curriculum: string | null;
  county: string | null;
  subCounty: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  email: string | null;
  adminName: string | null;
  createdAt: Date;
};

const STATUS_STYLES: Record<AppRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  SUSPENDED: "bg-gray-100 text-gray-700 ring-gray-200",
};

export function InstitutionsReviewClient({
  initialApplications,
  currentUserId,
}: {
  initialApplications: AppRow[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(initialApplications);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible: AppRow[] = filter === "PENDING" ? rows.filter((r) => r.status === "PENDING") : rows;

  function decide(id: string, decision: "APPROVE" | "REJECT", approverUserId: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await decideInstitutionApplication({ institutionId: id, decision, approverUserId });
      setPendingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === "APPROVE" ? "Institution approved" : "Application rejected");
      setRows((cur) =>
        cur.map((r) =>
          r.id === id ? { ...r, status: decision === "APPROVE" ? "ACTIVE" : "REJECTED" } : r,
        ),
      );
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Founder admin</p>
          <h1 className="text-2xl font-black text-gray-900">Institution applications</h1>
          <p className="text-sm text-gray-500">Review and approve school signups.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "PENDING" ? "default" : "outline"}
            onClick={() => setFilter("PENDING")}
            className={filter === "PENDING" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            Pending
          </Button>
          <Button size="sm" variant={filter === "ALL" ? "default" : "outline"} onClick={() => setFilter("ALL")}>
            All
          </Button>
        </div>
      </header>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No {filter === "PENDING" ? "pending" : ""} applications right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((app) => (
            <Card key={app.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  <p className="mt-1 text-xs text-gray-500">
                    {app.schoolType} · {app.curriculum} · {app.subCounty}, {app.county} ·{" "}
                    <span className="font-mono text-gray-700">{app.code}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1 ${STATUS_STYLES[app.status]}`}
                >
                  {app.status.toLowerCase()}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Contact</p>
                    <p className="text-sm text-gray-700">{app.email ?? "—"}</p>
                  </div>
                  {app.adminName && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Admin</p>
                      <p className="text-sm text-gray-700">{app.adminName}</p>
                    </div>
                  )}
                  {app.status === "PENDING" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => decide(app.id, "APPROVE", currentUserId)}
                        disabled={pendingId === app.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {pendingId === app.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(app.id, "REJECT", currentUserId)}
                        disabled={pendingId === app.id}
                        className="text-rose-600"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
