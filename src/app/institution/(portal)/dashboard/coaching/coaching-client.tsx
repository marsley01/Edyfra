"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Calendar, Plus, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/institution/data-table";
import { toast } from "sonner";
import { createCoachingAssignment, cancelCoachingAssignment } from "@/app/actions/institution-coaching";
import type { CoachingAssignment, CoachingStatus } from "@/generated/client";

const STATUS_STYLES: Record<CoachingStatus, string> = {
  SCHEDULED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  COMPLETED: "bg-gray-100 text-gray-600 ring-gray-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function CoachingClient({
  initialAssignments,
  holidayActive,
  students,
  teachers,
}: {
  initialAssignments: (CoachingAssignment & { student: { id: string; name: string }; teacher: { id: string; name: string } })[];
  holidayActive: boolean;
  students: { id: string; name: string }[];
  teachers: { id: string; name: string; subjects: string[] }[];
}) {
  const [rows, setRows] = useState(initialAssignments);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleCancel(id: string) {
    if (!confirm("Cancel this coaching assignment?")) return;
    startTransition(async () => {
      const res = await cancelCoachingAssignment(id);
      if (!res.ok) {
        toast.error("Could not cancel assignment");
        return;
      }
      toast.success("Assignment cancelled");
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: "CANCELLED" as CoachingStatus } : r)));
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Insights</p>
          <h1 className="text-2xl font-black text-gray-900">Holiday Coaching</h1>
          <p className="text-sm text-gray-500">
            Assign institution teachers to students for the holiday period.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> New assignment
        </Button>
      </header>

      <Card
        className={
          holidayActive
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-amber-200 bg-amber-50/40"
        }
      >
        <CardContent className="flex items-center gap-3 p-4">
          <Calendar className={holidayActive ? "h-5 w-5 text-emerald-600" : "h-5 w-5 text-amber-600"} />
          <div>
            <p className="text-sm font-black text-gray-900">
              {holidayActive ? "Holiday coaching is open" : "Holiday coaching is closed"}
            </p>
            <p className="text-xs text-gray-600">
              {holidayActive
                ? "Students can book their assigned teachers right now."
                : "Set the holiday window in Settings → Academic calendar to open booking."}
            </p>
          </div>
        </CardContent>
      </Card>

      <DataTable<typeof rows[number]>
        rows={rows}
        rowKey={(r) => r.id}
        empty={
          <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
            <Calendar className="h-8 w-8" />
            <p className="text-sm">No coaching assignments yet.</p>
          </div>
        }
        columns={[
          {
            key: "student",
            header: "Student",
            render: (r) => <span className="font-bold text-gray-900">{r.student.name}</span>,
          },
          {
            key: "teacher",
            header: "Teacher",
            render: (r) => <span className="font-bold text-gray-900">{r.teacher.name}</span>,
          },
          { key: "subject", header: "Subject" },
          {
            key: "schedule",
            header: "Schedule",
            render: (r) => <span className="text-xs text-gray-600">{r.schedule ?? "—"}</span>,
          },
          {
            key: "range",
            header: "Period",
            render: (r) => (
              <span className="text-xs text-gray-600">
                {format(r.startDate, "d MMM")} – {format(r.endDate, "d MMM yyyy")}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1 ${STATUS_STYLES[r.status]}`}
              >
                {r.status.toLowerCase()}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (r) =>
              r.status === "SCHEDULED" || r.status === "ACTIVE" ? (
                <button
                  onClick={() => handleCancel(r.id)}
                  disabled={pending}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Cancel"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              ) : null,
          },
        ]}
      />

      {showCreate && (
        <CreateDialog
          onClose={() => setShowCreate(false)}
          students={students}
          teachers={teachers}
          isHoliday={holidayActive}
        />
      )}
    </div>
  );
}

function CreateDialog({
  onClose,
  students,
  teachers,
  isHoliday,
}: {
  onClose: () => void;
  students: { id: string; name: string }[];
  teachers: { id: string; name: string; subjects: string[] }[];
  isHoliday: boolean;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [subject, setSubject] = useState(teachers[0]?.subjects[0] ?? "");
  const [schedule, setSchedule] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [pending, setPending] = useState(false);

  function onTeacherChange(id: string) {
    setTeacherId(id);
    const t = teachers.find((x) => x.id === id);
    if (t && t.subjects.length > 0) setSubject(t.subjects[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await createCoachingAssignment({
      studentUserId: studentId,
      teacherUserId: teacherId,
      subject,
      schedule: schedule || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isHoliday,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Assignment created");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">New coaching assignment</h2>
            <p className="text-xs text-gray-500">Pair a student with a teacher for a defined period.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Student" required>
            <Select value={studentId} onChange={setStudentId} options={students.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Teacher" required>
            <Select
              value={teacherId}
              onChange={onTeacherChange}
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          <Field label="Subject" required>
            <Select
              value={subject}
              onChange={setSubject}
              options={(teachers.find((t) => t.id === teacherId)?.subjects ?? []).map((s) => ({ value: s, label: s }))}
            />
          </Field>
          <Field label="Schedule (optional)">
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. Mon, Wed, Fri · 10:00–11:00"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="End date" required>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
              {pending ? "Creating…" : "Create assignment"}
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

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
