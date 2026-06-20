"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/lib/toast";
import { KENYA_COUNTIES } from "@/lib/kenya-counties";
import { INSTITUTION_PLANS } from "@/lib/institution-plans";
import { updateInstitutionSettings, addDeputyAdmin, upsertAcademicTerm } from "@/app/actions/institution-admin";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
}

export function SettingsClient({
  institution,
  term,
}: {
  institution: {
    id: string;
    name: string;
    motto: string | null;
    schoolType: string | null;
    curriculum: string | null;
    county: string | null;
    subCounty: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    plan: string | null;
    planLegacy: string;
    status: string;
    admins: Admin[];
  };
  term: { term: number; year: number; startDate: Date; endDate: Date; holidayStart: Date | null; holidayEnd: Date | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: institution.name,
    motto: institution.motto ?? "",
    schoolType: institution.schoolType ?? "SECONDARY",
    curriculum: institution.curriculum ?? "CBC",
    county: institution.county ?? "Nairobi",
    subCounty: institution.subCounty ?? "",
    address: institution.address ?? "",
    email: institution.contactEmail ?? "",
    phone: institution.contactPhone ?? "",
  });
  const [showDeputy, setShowDeputy] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateInstitutionSettings({
        name: form.name,
        motto: form.motto || null,
        schoolType: form.schoolType as "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY",
        curriculum: form.curriculum as "CBC" | "EIGHT_FOUR_FOUR" | "IGCSE" | "MIXED" | "UNIVERSITY",
        county: form.county,
        subCounty: form.subCounty,
        address: form.address || null,
        email: form.email || null,
        phone: form.phone || null,
      });
      if (!res.ok) {
        showError({ title: "We couldn't save those settings", cause: res.error, fix: "Try again, or refresh the page." });
      } else {
        showSuccess("Settings saved", { description: "Your school profile is up to date." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Account</p>
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">School profile, deputy admins, billing, and academic calendar.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">School profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="School name" required>
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </Field>
            <Field label="Motto">
              <Input value={form.motto} onChange={(v) => setForm({ ...form, motto: v })} />
            </Field>
            <Field label="School type" required>
              <Select
                value={form.schoolType}
                onChange={(v) => setForm({ ...form, schoolType: v })}
                options={["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY"].map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="Curriculum" required>
              <Select
                value={form.curriculum}
                onChange={(v) => setForm({ ...form, curriculum: v })}
                options={["CBC", "EIGHT_FOUR_FOUR", "IGCSE", "MIXED", "UNIVERSITY"].map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="County" required>
              <Select
                value={form.county}
                onChange={(v) => setForm({ ...form, county: v, subCounty: "" })}
                options={KENYA_COUNTIES.map((c) => ({ value: c.name, label: c.name }))}
              />
            </Field>
            <Field label="Sub-county" required>
              <Select
                value={form.subCounty}
                onChange={(v) => setForm({ ...form, subCounty: v })}
                options={(KENYA_COUNTIES.find((c) => c.name === form.county)?.subCounties ?? []).map((s) => ({
                  value: s,
                  label: s,
                }))}
              />
            </Field>
            <Field label="Contact email" required>
              <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Input value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Deputy admins</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowDeputy(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {institution.admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">
                      {a.title ?? a.role.replace("INSTITUTION_", "")} · {a.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 ring-1 ring-indigo-200">
                    {a.role.replace("INSTITUTION_", "")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan & billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {INSTITUTION_PLANS.map((p) => (
                <div
                  key={p.tier}
                  className={
                    p.tier === institution.plan
                      ? "rounded-xl border-2 border-indigo-300 bg-indigo-50/40 p-4"
                      : "rounded-xl border border-gray-200 p-4"
                  }
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{p.tier}</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">KES {p.monthlyKsh.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {p.studentCap == null ? "Unlimited" : `Up to ${p.studentCap} students`}
                  </p>
                  {p.tier === institution.plan && (
                    <span className="mt-3 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              To upgrade, change plan, or update billing, contact founders@edyfra.com — direct upgrade wiring is coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-gray-500">
              Set the current term, and the holiday window in which holiday coaching can be booked.
            </p>
            <TermForm term={term} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>

      {showDeputy && <AddDeputy onClose={() => setShowDeputy(false)} />}
    </div>
  );
}

function TermForm({
  term,
}: {
  term: { term: number; year: number; startDate: Date; endDate: Date; holidayStart: Date | null; holidayEnd: Date | null } | null;
}) {
  const [termN, setTermN] = useState(term?.term ?? 1);
  const [year, setYear] = useState(term?.year ?? new Date().getFullYear());
  const [startsOn, setStartsOn] = useState(term ? isoDate(term.startDate) : "");
  const [endsOn, setEndsOn] = useState(term ? isoDate(term.endDate) : "");
  const [holidayStart, setHolidayStart] = useState(term?.holidayStart ? isoDate(term.holidayStart) : "");
  const [holidayEnd, setHolidayEnd] = useState(term?.holidayEnd ? isoDate(term.holidayEnd) : "");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertAcademicTerm({
        term: termN,
        year,
        startDate: new Date(startsOn),
        endDate: new Date(endsOn),
        holidayStart: holidayStart ? new Date(holidayStart) : null,
        holidayEnd: holidayEnd ? new Date(holidayEnd) : null,
        makeCurrent: true,
      });
      if (!res.ok) {
        showError({ title: "We couldn't save that term", cause: res.error, fix: "Check the dates and try again." });
      } else {
        showSuccess("Term saved", { description: "Your academic calendar is updated." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Term" required>
          <Select
            value={String(termN)}
            onChange={(v) => setTermN(Number(v))}
            options={[1, 2, 3].map((n) => ({ value: String(n), label: `Term ${n}` }))}
          />
        </Field>
        <Field label="Year" required>
          <Input type="number" value={year} onChange={(v) => setYear(Number(v))} />
        </Field>
            <Field label="Term starts" required>
              <Input type="date" value={startsOn} onChange={(v) => setStartsOn(v)} />
            </Field>
            <Field label="Term ends" required>
              <Input type="date" value={endsOn} onChange={(v) => setEndsOn(v)} />
            </Field>
            <Field label="Holiday starts">
              <Input type="date" value={holidayStart} onChange={(v) => setHolidayStart(v)} />
            </Field>
            <Field label="Holiday ends">
              <Input type="date" value={holidayEnd} onChange={(v) => setHolidayEnd(v)} />
            </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save term
        </Button>
      </div>
    </form>
  );
}

function AddDeputy({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState<"PRINCIPAL" | "DEPUTY" | "HOD" | "REGISTRAR" | "OTHER">("DEPUTY");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await addDeputyAdmin({ name, email, title });
    setPending(false);
    if (!res.ok) showError({ title: "We couldn't invite that deputy", cause: res.error, fix: "Double-check the email and try again." });
    else {
      showSuccess("Deputy admin invited", { description: "They've been emailed a setup link." });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-black text-gray-900">Add deputy admin</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Full name" required>
            <Input value={name} onChange={(v) => setName(v)} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(v) => setEmail(v)} />
          </Field>
          <Field label="Title" required>
            <Select
              value={title}
              onChange={(v) => setTitle(v as "PRINCIPAL" | "DEPUTY" | "HOD" | "REGISTRAR" | "OTHER")}
              options={[
                { value: "DEPUTY", label: "Deputy" },
                { value: "PRINCIPAL", label: "Principal" },
                { value: "HOD", label: "Head of Department" },
                { value: "REGISTRAR", label: "Registrar" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-gray-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Input({ className = "", ...props }: { onChange?: (v: string) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const { onChange, ...rest } = props;
  return (
    <input
      {...rest}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:text-sm ${className}`}
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
      className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
