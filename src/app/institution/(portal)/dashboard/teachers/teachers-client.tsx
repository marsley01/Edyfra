"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, UserPlus, X, XCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/institution/data-table";
import { Initials } from "@/components/institution/initials";
import { showError, showSuccess } from "@/lib/toast";
import { inviteTeacher, removeTeacher } from "@/app/actions/institution-admin";
import type { TeacherRow } from "@/app/actions/institution-admin";

const COLORS = ["indigo", "cyan", "emerald", "amber", "rose", "violet"] as const;
function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
}

const STATUS_STYLES: Record<TeacherRow["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INVITED: "bg-amber-50 text-amber-700 ring-amber-200",
  REMOVED: "bg-gray-100 text-gray-500 ring-gray-200",
};

export function TeachersClient({ initialRows }: { initialRows: TeacherRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.subjects.some((sub) => sub.toLowerCase().includes(s)),
    );
  }, [rows, search]);

  function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the institution? Their Edyfra account is preserved.`)) return;
    startTransition(async () => {
      const res = await removeTeacher(id);
      if (!res?.ok) {
        showError({
          title: "Couldn't remove that teacher",
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
          <h1 className="text-2xl font-black text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500">
            {rows.length} total · {filtered.length} shown
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="mr-2 h-4 w-4" /> Invite teacher
        </Button>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or subject…"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable<TeacherRow>
        rows={filtered}
        rowKey={(r) => r.id}
        empty={
          <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
            <GraduationCap className="h-8 w-8" />
            <p className="text-sm">No teachers yet — invite your first teacher.</p>
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
          {
            key: "subjects",
            header: "Subjects",
            render: (r) =>
              r.subjects.length === 0 ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {r.subjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            key: "forms",
            header: "Forms",
            render: (r) =>
              r.forms.length === 0 ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                r.forms.join(", ")
              ),
          },
          {
            key: "sessionsCompleted",
            header: "Sessions",
            align: "right",
            render: (r) => (
              <span className="font-black tabular-nums text-gray-900">{r.sessionsCompleted}</span>
            ),
          },
          {
            key: "studentsAssigned",
            header: "Students",
            align: "right",
            render: (r) => (
              <span className="font-black tabular-nums text-gray-900">{r.studentsAssigned}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1 ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (r) =>
              r.status === "ACTIVE" ? (
                <button
                  onClick={() => handleRemove(r.id, r.name)}
                  disabled={pending}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Remove from institution"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              ) : null,
          },
        ]}
      />

      {showInvite && <InviteTeacherDialog onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function InviteTeacherDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [formYear, setFormYear] = useState("");
  const [pending, setPending] = useState(false);

  function addSubject() {
    const v = subjectInput.trim();
    if (!v) return;
    if (subjects.includes(v)) return;
    setSubjects((s) => [...s, v]);
    setSubjectInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subjects.length === 0) {
      showError({
        title: "Add at least one subject",
        cause: "The teacher needs something they can teach.",
        fix: "Pick a subject from the list, then save again.",
      });
      return;
    }
    setPending(true);
    const res = await inviteTeacher({
      name,
      email,
      subjects,
      formYear: formYear || null,
    });
    setPending(false);
    if (!res.ok) {
      showError({
        title: "We couldn't send that invite",
        cause: res.error,
        fix: "Double-check the email and try again.",
      });
      return;
    }
    showSuccess("Invitation sent", { description: `${email} will get an email with next steps.` });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Invite a teacher</h2>
            <p className="text-xs text-gray-500">They'll get an email to create an Edyfra account.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mary Njogu" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.ac.ke" />
            </Field>
          </div>
          <Field label="Subjects" required>
            <div className="flex gap-2">
              <Input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubject();
                  }
                }}
                placeholder="e.g. Mathematics"
              />
              <Button type="button" onClick={addSubject} variant="outline" className="border-gray-200">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSubjects((cur) => cur.filter((x) => x !== s))}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="Form / Year (optional)">
            <Input value={formYear} onChange={(e) => setFormYear(e.target.value)} placeholder="e.g. Form 3" />
          </Field>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
              {pending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    />
  );
}
