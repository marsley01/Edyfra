"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/institution/data-table";
import { PerformanceBadge, type OverallStatus } from "@/components/institution/performance-badge";
import { Initials } from "@/components/institution/initials";
import { showError, showSuccess } from "@/lib/toast";
import { addStudent, removeStudent } from "@/app/actions/institution-admin";
import { bulkInviteStudents } from "@/app/actions/institution-invitations";
import type { StudentRow } from "@/app/actions/institution-admin";

const COLORS: (keyof typeof PALETTE)[] = ["indigo", "cyan", "emerald", "amber", "rose", "violet"];
const PALETTE = { indigo: 1, cyan: 1, emerald: 1, amber: 1, rose: 1, violet: 1 } as const;

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
}

export function StudentsClient({ initialRows }: { initialRows: StudentRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [formFilter, setFormFilter] = useState<string>("");
  const [perfFilter, setPerfFilter] = useState<"" | OverallStatus>("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [pending, startTransition] = useTransition();

  const forms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.form))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (formFilter && r.form !== formFilter) return false;
      if (perfFilter && r.performance !== perfFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.subjects.some((sub) => sub.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [rows, search, formFilter, perfFilter]);

  function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the institution? Their Edyfra account is preserved.`)) return;
    startTransition(async () => {
      const res = await removeStudent(id);
      if (!res?.ok) {
        showError({
          title: "Couldn't remove that student",
          cause: "We didn't get a confirmation from the server.",
          fix: "Try again, or refresh the page.",
        });
        return;
      }
      showSuccess(`${name} removed`, { description: "They no longer have access to this institution." });
      setRows((cur) => cur.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">People</p>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">
            {rows.length} enrolled · {filtered.length} shown
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulk(true)} variant="outline" className="border-gray-200">
            <Upload className="mr-2 h-4 w-4" /> Bulk upload
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Add student
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[12rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or subject…"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All forms</option>
              {forms.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              value={perfFilter}
              onChange={(e) => setPerfFilter(e.target.value as "" | OverallStatus)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All performance</option>
              <option value="GREEN">On track</option>
              <option value="YELLOW">Monitor</option>
              <option value="RED">At risk</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <DataTable<StudentRow>
        rows={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/institution/dashboard/students/${r.id}`)}
        empty={
          <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
            <Users className="h-8 w-8" />
            <p className="text-sm">No students match the current filters.</p>
          </div>
        }
        columns={[
          {
            key: "name",
            header: "Name",
            render: (r) => (
              <div className="flex items-center gap-3">
                <Initials name={r.name} color={hashColor(r.name)} className="!h-8 !w-8 !text-[11px]" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900">{r.name}</p>
                  <p className="truncate text-xs text-gray-500">{r.email}</p>
                </div>
              </div>
            ),
          },
          { key: "form", header: "Form" },
          {
            key: "subjects",
            header: "Subjects",
            render: (r) =>
              r.subjects.length === 0 ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {r.subjects.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                  {r.subjects.length > 3 && (
                    <span className="text-[10px] font-bold text-gray-500">
                      +{r.subjects.length - 3}
                    </span>
                  )}
                </div>
              ),
          },
          {
            key: "lastActive",
            header: "Last active",
            render: (r) => (
              <span className="text-xs text-gray-600">
                {r.lastActive ? new Date(r.lastActive).toLocaleDateString() : "—"}
              </span>
            ),
          },
          {
            key: "averageMarks",
            header: "Average",
            render: (r) =>
              r.averageMarks == null ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                <span className="font-black tabular-nums text-gray-900">{r.averageMarks}%</span>
              ),
          },
          {
            key: "performance",
            header: "Status",
            render: (r) => <PerformanceBadge status={r.performance} />,
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (r) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(r.id, r.name);
                }}
                disabled={pending}
                className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remove from institution"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ),
          },
        ]}
      />

      {showAdd && <AddStudentDialog onClose={() => setShowAdd(false)} />}
      {showBulk && <BulkUploadDialog onClose={() => setShowBulk(false)} />}
    </div>
  );
}

function AddStudentDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formYear, setFormYear] = useState("1");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await addStudent({
      fullName: name,
      email,
      formYear: Number(formYear),
      admissionNumber: admissionNumber || null,
      stream: null,
    });
    setPending(false);
    if (!res.ok) {
      showError({
        title: "We couldn't add that student",
        cause: res.error,
        fix: "Double-check the email and details, then try again.",
      });
      return;
    }
    showSuccess(`${name} added`, { description: "They're now on the institution's roster." });
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Add a student" subtitle="Create an Edyfra account and link it to your institution.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brian Otieno" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@school.ac.ke" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form / Year" required>
            <select
              value={formYear}
              onChange={(e) => setFormYear(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  Form {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Admission #">
            <Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} placeholder="ADM/2025/001" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
            {pending ? "Adding…" : "Add student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BulkUploadDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      showError({
        title: "Add a header row and at least one student",
        cause: "Your paste is empty or only has one line.",
        fix: "Copy a row for 'name,email' plus at least one student, then try again.",
      });
      return;
    }
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["name", "email"];
    const missing = required.filter((r) => !header.includes(r));
    if (missing.length) {
      showError({
        title: `Missing columns: ${missing.join(", ")}`,
        cause: "Your header row needs at least 'name' and 'email'.",
        fix: "Add the missing column names to the first row, then paste again.",
      });
      return;
    }
    const rows = lines.slice(1).map((l) => {
      const cells = l.split(",").map((c) => c.trim());
      return {
        name: cells[header.indexOf("name")] ?? "",
        email: cells[header.indexOf("email")] ?? "",
        formYear: cells[header.indexOf("form")] || cells[header.indexOf("formyear")] || cells[header.indexOf("year")] || undefined,
        admissionNumber: cells[header.indexOf("admissionnumber")] || cells[header.indexOf("admission_number")] || cells[header.indexOf("adm")] || undefined,
      };
    });
    setPending(true);
    const res = await bulkInviteStudents({ rows: rows.map((r) => ({ ...r, formYear: r.formYear, admissionNumber: r.admissionNumber })) });
    setPending(false);
    if (!res.ok) {
      showError({
        title: "We couldn't invite those students",
        cause: res.error,
        fix: "Check the rows for invalid emails, then try again.",
      });
      return;
    }
    showSuccess(`Invited ${res.invited} students`, { description: "They'll each get an email with next steps." });
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Bulk invite students" subtitle="Paste rows from your spreadsheet. Header row required.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="CSV (name, email, form, admissionNumber)" required>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={`name,email,form,admissionNumber
Brian Otieno,brian@school.ac.ke,2,ADM/2025/001
Aisha Wambui,aisha@school.ac.ke,2,ADM/2025/002`}
            className="w-full rounded-md border border-gray-200 bg-white p-3 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </Field>
        <div className="rounded-xl bg-indigo-50/60 p-3 text-xs text-indigo-900">
          <p className="font-bold">Each student will receive an email invitation.</p>
          <p className="mt-0.5 text-indigo-900/70">
            They create an Edyfra account (or sign in) and are automatically linked to your institution.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
            {pending ? "Inviting…" : "Send invitations"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-gray-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    />
  );
}
