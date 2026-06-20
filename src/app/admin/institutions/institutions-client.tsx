"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  X,
  Loader2,
  Building2,
  Mail,
  Phone,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  Search,
  MapPin,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { showError, showSuccess } from "@/lib/toast";
import { decideInstitutionApplication, deleteInstitution } from "@/app/actions/institution-founder";

type Status = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
type PlanTier = "STARTER" | "GROWTH" | "ENTERPRISE" | null;
type SchoolType = "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | null;
type Curriculum = "CBC" | "EIGHT_FOUR_FOUR" | "IGCSE" | "MIXED" | "UNIVERSITY" | null;

type AppRow = {
  id: string;
  code: string | null;
  name: string;
  schoolType: SchoolType;
  curriculum: Curriculum;
  county: string | null;
  subCounty: string | null;
  studentCount: number | null;
  planTier: PlanTier;
  status: Status;
  email: string | null;
  adminName: string | null;
  adminTitle: string | null;
  adminPhone: string | null;
  adminEmail: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  membersCount: number;
  studentsCount: number;
  tutorsCount: number;
};

const STATUS_STYLES: Record<Status, { bg: string; ring: string; label: string }> = {
  PENDING: { bg: "bg-amber-500/10 text-amber-500", ring: "ring-amber-500/30", label: "Pending" },
  ACTIVE: { bg: "bg-emerald-500/10 text-emerald-500", ring: "ring-emerald-500/30", label: "Active" },
  REJECTED: { bg: "bg-rose-500/10 text-rose-500", ring: "ring-rose-500/30", label: "Rejected" },
  SUSPENDED: { bg: "bg-zinc-500/10 text-zinc-400", ring: "ring-zinc-500/30", label: "Suspended" },
};

const PLAN_STYLES: Record<NonNullable<PlanTier>, { price: string; tone: string }> = {
  STARTER: { price: "KES 4,500 / mo", tone: "text-zinc-300" },
  GROWTH: { price: "KES 12,000 / mo", tone: "text-indigo-400" },
  ENTERPRISE: { price: "Custom", tone: "text-amber-400" },
};

const TYPE_LABEL: Record<NonNullable<SchoolType>, string> = {
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  COLLEGE: "College",
  UNIVERSITY: "University",
};

const CURRICULUM_LABEL: Record<NonNullable<Curriculum>, string> = {
  CBC: "CBC",
  EIGHT_FOUR_FOUR: "8-4-4",
  IGCSE: "IGCSE",
  MIXED: "Mixed",
  UNIVERSITY: "University",
};

export function InstitutionsReviewClient({
  initialApplications,
  currentUserId,
  pendingCount,
}: {
  initialApplications: AppRow[];
  currentUserId: string;
  pendingCount: number;
}) {
  const [rows, setRows] = useState<AppRow[]>(initialApplications);
  const [filter, setFilter] = useState<"PENDING" | "ACTIVE" | "REJECTED" | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const livePending = rows.filter((r) => r.status === "PENDING").length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "ALL" ? true : r.status === filter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.code ?? "").toLowerCase().includes(q) ||
          (r.adminName ?? "").toLowerCase().includes(q) ||
          (r.adminEmail ?? "").toLowerCase().includes(q) ||
          (r.county ?? "").toLowerCase().includes(q) ||
          (r.subCounty ?? "").toLowerCase().includes(q)
        );
      });
  }, [rows, filter, search]);

  function decide(id: string, decision: "APPROVE" | "REJECT") {
    setPendingId(id);
    const previous = rows;
    // Optimistic update
    setRows((cur) =>
      cur.map((r) =>
        r.id === id ? { ...r, status: decision === "APPROVE" ? "ACTIVE" : "REJECTED" } : r,
      ),
    );
    startRefresh(async () => {
      const res = await decideInstitutionApplication({ institutionId: id, decision, approverUserId: currentUserId });
      if (!res.ok) {
        setRows(previous);
        showError({
          title: "We couldn't record that decision",
          cause: res.error,
          fix: "Try again, or refresh the page.",
        });
        setPendingId(null);
        return;
      }
      showSuccess(
        decision === "APPROVE" ? "Institution approved" : "Application rejected",
        {
          description:
            decision === "APPROVE"
              ? "The school is now live on Edyfra and the admin has been emailed."
              : "The applicant has been marked as rejected.",
        },
      );
      setPendingId(null);
    });
  }

  function remove(id: string) {
    setDeletingId(id);
    startRefresh(async () => {
      const res = await deleteInstitution(id);
      if (!res.ok) {
        showError({
          title: "Failed to delete school",
          cause: res.error,
          fix: "Try again, or check server logs.",
        });
        setDeletingId(null);
        return;
      }
      setRows((cur) => cur.filter((r) => r.id !== id));
      showSuccess("Institution deleted", {
        description: "The school and its primary admin have been completely removed.",
      });
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Founder admin
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground">Institution approvals</h1>
            {livePending > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-[10px] font-black uppercase tracking-widest text-black">
                {livePending} pending
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve school signups. {pendingCount} application{pendingCount === 1 ? "" : "s"} waiting for review.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startRefresh(() => window.location.reload())}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </header>

      {/* Filter + search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-2xl border border-border bg-secondary/30 p-1">
          {(["PENDING", "ACTIVE", "REJECTED", "ALL"] as const).map((f) => {
            const active = filter === f;
            const count = f === "ALL" ? rows.length : rows.filter((r) => r.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f.toLowerCase()} <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school, code, admin, county…"
            className="h-10 w-64 rounded-2xl border border-border bg-secondary/30 pl-9 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {filter === "PENDING"
                  ? "You're all caught up"
                  : "Nothing here yet"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filter === "PENDING"
                  ? "No institution applications are waiting for review."
                  : `No ${filter.toLowerCase()} institutions match your filter.`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              pending={pendingId === app.id}
              deleting={deletingId === app.id}
              onApprove={() => decide(app.id, "APPROVE")}
              onReject={() => decide(app.id, "REJECT")}
              onDelete={() => remove(app.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  pending,
  deleting,
  onApprove,
  onReject,
  onDelete,
}: {
  app: AppRow;
  pending: boolean;
  deleting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_STYLES[app.status];
  const plan = app.planTier ? PLAN_STYLES[app.planTier] : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-0 sm:flex-row">
          {/* Left rail: status + plan */}
          <div className="flex shrink-0 flex-col items-start gap-2 border-b border-border bg-secondary/20 p-5 sm:w-44 sm:border-b-0 sm:border-r">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1 " +
                status.bg +
                " " +
                status.ring
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status.label}
            </span>
            {app.planTier && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Plan
                </p>
                <p className={"text-sm font-black " + (plan?.tone ?? "text-foreground")}>
                  {app.planTier}
                </p>
                {plan && <p className="text-[10px] text-muted-foreground">{plan.price}</p>}
              </div>
            )}
            {app.code && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Code
                </p>
                <p className="font-mono text-xs text-foreground/80">{app.code}</p>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 p-5">
            {/* Title row */}
            <div>
              <h2 className="text-lg font-black text-foreground">{app.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                {app.schoolType && (
                  <span className="font-bold text-foreground/80">{TYPE_LABEL[app.schoolType]}</span>
                )}
                {app.schoolType && app.curriculum && <span>·</span>}
                {app.curriculum && <span>{CURRICULUM_LABEL[app.curriculum]}</span>}
                {(app.schoolType || app.curriculum) && (app.county || app.subCounty) && (
                  <span>·</span>
                )}
                {(app.subCounty || app.county) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[app.subCounty, app.county].filter(Boolean).join(", ")}
                  </span>
                )}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 text-xs">
              {app.studentCount != null && (
                <Stat icon={GraduationCap} label="~ students" value={app.studentCount.toLocaleString()} />
              )}
              <Stat icon={Users} label="members" value={app.membersCount} />
              <Stat icon={UserCheck} label="students on roster" value={app.studentsCount} />
              <Stat icon={Sparkles} label="tutors" value={app.tutorsCount} />
              <Stat
                icon={Calendar}
                label="applied"
                value={new Date(app.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              />
            </div>

            {/* Contact row */}
            <div className="grid gap-2 rounded-2xl border border-border bg-secondary/20 p-3 text-xs sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Primary admin
                </p>
                <p className="font-bold text-foreground">
                  {app.adminName ?? "—"}{" "}
                  {app.adminTitle && (
                    <span className="font-medium text-muted-foreground">· {humanize(app.adminTitle)}</span>
                  )}
                </p>
                {app.adminEmail && (
                  <a
                    href={`mailto:${app.adminEmail}`}
                    className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"
                  >
                    <Mail className="h-3 w-3" />
                    {app.adminEmail}
                  </a>
                )}
                {app.adminPhone && (
                  <a
                    href={`tel:${app.adminPhone}`}
                    className="flex items-center gap-1.5 text-foreground/80 hover:text-primary"
                  >
                    <Phone className="h-3 w-3" />
                    {app.adminPhone}
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  School contact
                </p>
                {app.email && (
                  <a
                    href={`mailto:${app.email}`}
                    className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"
                  >
                    <Mail className="h-3 w-3" />
                    {app.email}
                  </a>
                )}
                {app.approvedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    Approved on{" "}
                    {new Date(app.approvedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {app.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={onApprove}
                    disabled={pending}
                    className="bg-emerald-600 font-bold hover:bg-emerald-700"
                  >
                    {pending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReject}
                    disabled={pending}
                    className="font-bold text-rose-500 hover:bg-rose-500/10"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Decision recorded
                  </span>
                  <Dialog>
                    <DialogTrigger render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleting}
                        className="font-bold text-red-500 hover:bg-red-500/10 hover:text-red-600 border-red-500/20"
                      />
                    }>
                      {deleting ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Delete School
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-500">Delete Institution</DialogTitle>
                        <DialogDescription>
                          This is a permanent action. It will delete the school <strong>{app.name}</strong> from the database and completely remove its primary admin from Supabase Auth. This cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="sm:justify-end">
                        <DialogClose render={<Button variant="outline" />}>
                          Cancel
                        </DialogClose>
                        <DialogClose render={<Button variant="destructive" onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold" />}>
                          Yes, Delete
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <a
                href={`mailto:${app.adminEmail ?? app.email ?? ""}?subject=${encodeURIComponent(
                  `Re: ${app.name} on Edyfra`,
                )}`}
                className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" /> Email admin
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/30 px-2.5 py-1">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="font-black text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function humanize(s: string) {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
