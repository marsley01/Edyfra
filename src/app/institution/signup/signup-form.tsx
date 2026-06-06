"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";
import { submitInstitutionApplication } from "@/app/actions/institution-signup";
import { INSTITUTION_PLANS, type PlanDefinition } from "@/lib/institution-plans";

interface County {
  name: string;
  subCounties: string[];
}

const STEPS = [
  { id: 1, title: "School details", icon: School, description: "Tell us about the institution" },
  { id: 2, title: "Admin account", icon: User, description: "Who is the primary admin?" },
  { id: 3, title: "Plan", icon: Sparkles, description: "Pick a plan that fits" },
  { id: 4, title: "Review", icon: CheckCircle2, description: "Confirm and submit" },
];

interface FormState {
  schoolName: string;
  schoolType: "" | "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY";
  curriculum: "" | "CBC" | "EIGHT_FOUR_FOUR" | "IGCSE" | "MIXED" | "UNIVERSITY";
  county: string;
  subCounty: string;
  studentCount: string;

  adminName: string;
  adminTitle: "" | "PRINCIPAL" | "DEPUTY" | "HOD" | "REGISTRAR" | "OTHER";
  adminEmail: string;
  adminPhone: string;
  password: string;
  confirmPassword: string;

  plan: "STARTER" | "GROWTH" | "ENTERPRISE";
}

const EMPTY: FormState = {
  schoolName: "",
  schoolType: "",
  curriculum: "",
  county: "",
  subCounty: "",
  studentCount: "",
  adminName: "",
  adminTitle: "",
  adminEmail: "",
  adminPhone: "",
  password: "",
  confirmPassword: "",
  plan: "GROWTH",
};

export function SignupForm({ counties }: { counties: County[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const subCounties = useMemo(
    () => counties.find((c) => c.name === form.county)?.subCounties ?? [],
    [counties, form.county],
  );

  const plan = INSTITUTION_PLANS.find((p) => p.tier === form.plan)!;

  function canAdvance(s: number): { ok: boolean; reason?: string } {
    if (s === 1) {
      if (!form.schoolName.trim()) return { ok: false, reason: "School name is required" };
      if (!form.schoolType) return { ok: false, reason: "Choose a school type" };
      if (!form.curriculum) return { ok: false, reason: "Choose a curriculum" };
      if (!form.county) return { ok: false, reason: "Choose a county" };
      if (!form.subCounty) return { ok: false, reason: "Choose a sub-county" };
      if (!form.studentCount) return { ok: false, reason: "How many students?" };
      if (Number(form.studentCount) < 1) return { ok: false, reason: "Student count must be at least 1" };
    }
    if (s === 2) {
      if (!form.adminName.trim()) return { ok: false, reason: "Admin name is required" };
      if (!form.adminTitle) return { ok: false, reason: "Choose an admin title" };
      if (!form.adminEmail.includes("@")) return { ok: false, reason: "A valid email is required" };
      if (form.adminPhone.trim().length < 9) return { ok: false, reason: "Phone number is too short" };
      if (form.password.length < 8) return { ok: false, reason: "Password must be at least 8 characters" };
      if (form.password !== form.confirmPassword) return { ok: false, reason: "Passwords do not match" };
    }
    return { ok: true };
  }

  async function handleNext() {
    const check = canAdvance(step);
    if (!check.ok) {
      showError({
        title: check.reason ?? "Please complete the step",
        cause: "Some details on this step still need your attention.",
        fix: "Fill in the highlighted fields, then hit Continue again.",
      });
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    const result = await submitInstitutionApplication({
      schoolName: form.schoolName,
      schoolType: form.schoolType as "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY",
      curriculum: form.curriculum as "CBC" | "EIGHT_FOUR_FOUR" | "IGCSE" | "MIXED" | "UNIVERSITY",
      county: form.county,
      subCounty: form.subCounty,
      studentCount: Number(form.studentCount),
      adminName: form.adminName,
      adminTitle: form.adminTitle as "PRINCIPAL" | "DEPUTY" | "HOD" | "REGISTRAR" | "OTHER",
      adminEmail: form.adminEmail,
      adminPhone: form.adminPhone,
      password: form.password,
      plan: form.plan,
    });
    setSubmitting(false);
    if (!result.ok) {
      showError({
        title: "We couldn't submit that",
        cause: result.error,
        fix: "Fix anything highlighted above and try again.",
      });
      if (result.field === "adminEmail") setStep(2);
      return;
    }
    setSubmitted(true);
    showSuccess("Application submitted", { description: "We'll review it and email you within a couple of business days." });
  }

  if (submitted) {
    return <SubmittedPanel schoolName={form.schoolName} adminEmail={form.adminEmail} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Edyfra Institutions</h1>
          <p className="text-sm text-gray-500">Bring your school onto Edyfra — apply in under 4 minutes.</p>
        </div>
      </header>

      <Stepper current={step} />

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        {step === 1 && (
          <Step1
            form={form}
            update={update}
            counties={counties}
            subCounties={subCounties}
          />
        )}
        {step === 2 && <Step2 form={form} update={update} />}
        {step === 3 && <Step3 form={form} update={update} />}
        {step === 4 && <Step4 form={form} plan={plan} />}

        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (step > 1 ? setStep(step - 1) : router.push("/institution"))}
            className="text-gray-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step > 1 ? "Back" : "Cancel"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="bg-indigo-600 px-6 hover:bg-indigo-700"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : step === 4 ? (
              <>
                Submit application
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Your data is encrypted and never shared.
      </footer>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {STEPS.map((s) => {
        const done = current > s.id;
        const active = current === s.id;
        const Icon = s.icon;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all",
              active ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                done && "bg-emerald-100 text-emerald-700",
                active && "bg-indigo-600 text-white",
                !done && !active && "bg-gray-100 text-gray-400",
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Step {s.id}
              </p>
              <p className={cn("text-sm font-bold", active ? "text-gray-900" : "text-gray-600")}>
                {s.title}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-gray-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

function Step1({
  form,
  update,
  counties,
  subCounties,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  counties: County[];
  subCounties: string[];
}) {
  return (
    <div>
      <h2 className="text-xl font-black text-gray-900">School details</h2>
      <p className="mt-1 text-sm text-gray-500">Tell us about the institution you're bringing onto Edyfra.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="School name" required>
          <Input
            value={form.schoolName}
            onChange={(e) => update("schoolName", e.target.value)}
            placeholder="e.g. Nairobi Academy"
            className="h-11"
          />
        </Field>
        <Field label="Approximate number of students" required>
          <Input
            type="number"
            min={1}
            value={form.studentCount}
            onChange={(e) => update("studentCount", e.target.value)}
            placeholder="e.g. 350"
            className="h-11"
          />
        </Field>

        <Field label="School type" required>
          <Select
            value={form.schoolType}
            onChange={(v) => update("schoolType", v as FormState["schoolType"])}
            placeholder="Select type"
            options={[
              { value: "PRIMARY", label: "Primary" },
              { value: "SECONDARY", label: "Secondary" },
              { value: "COLLEGE", label: "College" },
              { value: "UNIVERSITY", label: "University" },
            ]}
          />
        </Field>
        <Field label="Curriculum" required>
          <Select
            value={form.curriculum}
            onChange={(v) => update("curriculum", v as FormState["curriculum"])}
            placeholder="Select curriculum"
            options={[
              { value: "CBC", label: "CBC" },
              { value: "EIGHT_FOUR_FOUR", label: "8-4-4" },
              { value: "IGCSE", label: "IGCSE" },
              { value: "MIXED", label: "Mixed" },
              { value: "UNIVERSITY", label: "University" },
            ]}
          />
        </Field>

        <Field label="County" required>
          <Select
            value={form.county}
            onChange={(v) => {
              update("county", v);
              update("subCounty", "");
            }}
            placeholder="Select county"
            options={counties.map((c) => ({ value: c.name, label: c.name }))}
          />
        </Field>
        <Field label="Sub-county" required>
          <Select
            value={form.subCounty}
            onChange={(v) => update("subCounty", v)}
            placeholder={form.county ? "Select sub-county" : "Pick a county first"}
            options={subCounties.map((s) => ({ value: s, label: s }))}
            disabled={!form.county}
          />
        </Field>
      </div>
    </div>
  );
}

function Step2({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <div>
      <h2 className="text-xl font-black text-gray-900">Admin account</h2>
      <p className="mt-1 text-sm text-gray-500">
        This person will be the primary admin and receive the login link once approved.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input
            value={form.adminName}
            onChange={(e) => update("adminName", e.target.value)}
            placeholder="e.g. Jane Wanjiku"
            className="h-11"
          />
        </Field>
        <Field label="Title" required>
          <Select
            value={form.adminTitle}
            onChange={(v) => update("adminTitle", v as FormState["adminTitle"])}
            placeholder="Select title"
            options={[
              { value: "PRINCIPAL", label: "Principal" },
              { value: "DEPUTY", label: "Deputy Principal" },
              { value: "HOD", label: "Head of Department" },
              { value: "REGISTRAR", label: "Registrar" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </Field>

        <Field label="Email" required hint="This becomes the admin's login.">
          <Input
            type="email"
            value={form.adminEmail}
            onChange={(e) => update("adminEmail", e.target.value)}
            placeholder="admin@school.ac.ke"
            className="h-11"
          />
        </Field>
        <Field label="Phone number" required>
          <Input
            type="tel"
            value={form.adminPhone}
            onChange={(e) => update("adminPhone", e.target.value)}
            placeholder="+254 7XX XXX XXX"
            className="h-11"
          />
        </Field>

        <Field label="Create password" required hint="At least 8 characters.">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="••••••••"
            className="h-11"
          />
        </Field>
        <Field label="Confirm password" required>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder="••••••••"
            className="h-11"
          />
        </Field>
      </div>
    </div>
  );
}

function Step3({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <div>
      <h2 className="text-xl font-black text-gray-900">Pick a plan</h2>
      <p className="mt-1 text-sm text-gray-500">All plans include teachers, analytics, holiday coaching and reports.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {INSTITUTION_PLANS.map((p) => (
          <PlanCard
            key={p.tier}
            plan={p}
            selected={form.plan === p.tier}
            onSelect={() => update("plan", p.tier as FormState["plan"])}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Need something custom? <a className="font-bold text-indigo-600 hover:underline" href="mailto:hello@edyfra.com">Contact us</a> for a tailored quote.
      </p>
    </div>
  );
}

function Step4({ form, plan }: { form: FormState; plan: PlanDefinition }) {
  return (
    <div>
      <h2 className="text-xl font-black text-gray-900">Review &amp; submit</h2>
      <p className="mt-1 text-sm text-gray-500">One last look before we send this to the Edyfra founders.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ReviewCard
          icon={School}
          title="School"
          rows={[
            ["Name", form.schoolName],
            ["Type", humanize(form.schoolType)],
            ["Curriculum", humanize(form.curriculum)],
            ["County / Sub-county", `${form.county} · ${form.subCounty}`],
            ["Students", form.studentCount],
          ]}
        />
        <ReviewCard
          icon={User}
          title="Admin"
          rows={[
            ["Name", form.adminName],
            ["Title", humanize(form.adminTitle)],
            ["Email", form.adminEmail],
            ["Phone", form.adminPhone],
          ]}
        />
        <ReviewCard
          icon={Sparkles}
          title="Plan"
          rows={[
            ["Tier", plan.name],
            ["Price", `KES ${plan.monthlyKsh.toLocaleString()} / month`],
            ["Student cap", plan.studentCap ? plan.studentCap.toLocaleString() : "Unlimited"],
          ]}
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        <p className="font-bold">What happens next?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-indigo-900/80">
          <li>The Edyfra founders review your application within 24 hours.</li>
          <li>Once approved, the admin receives a confirmation email with a login link.</li>
          <li>You can then start adding teachers and students from the dashboard.</li>
        </ul>
      </div>
    </div>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  rows,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rows: [string, string][];
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-gray-50/40 p-5", className)}>
      <div className="flex items-center gap-2 text-indigo-600">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-right font-bold text-gray-900">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PlanDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-5 text-left transition-all",
        selected
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-gray-200 hover:border-indigo-300",
      )}
    >
      {plan.popular && (
        <span className="absolute -top-2 right-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          Most popular
        </span>
      )}
      <h3 className="text-base font-black text-gray-900">{plan.name}</h3>
      <p className="mt-1 text-xs text-gray-500">{plan.tagline}</p>
      <p className="mt-4 text-2xl font-black text-gray-900">
        KES {plan.monthlyKsh.toLocaleString()}
        <span className="text-sm font-medium text-gray-500">/mo</span>
      </p>
      <p className="mt-1 text-xs font-bold text-indigo-600">
        {plan.studentCap ? `Up to ${plan.studentCap} students` : "Unlimited students"}
      </p>
      <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100",
        disabled && "cursor-not-allowed bg-gray-50 text-gray-400",
      )}
    >
      <option value="">{placeholder ?? "Select"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function humanize(s: string | undefined | null): string {
  if (!s) return "—";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SubmittedPanel({ schoolName, adminEmail }: { schoolName: string; adminEmail: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-black text-gray-900">Application received</h1>
      <p className="mt-2 text-sm text-gray-600">
        Thank you for applying on behalf of <strong>{schoolName}</strong>. The Edyfra team will review
        your details and contact <strong>{adminEmail}</strong> within 24 hours.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <NextStep icon={Mail} label="Email confirmation" sub="Sent immediately" />
        <NextStep icon={MapPin} label="Founder review" sub="Within 24 hours" />
        <NextStep icon={KeyRound} label="Login link" sub="When approved" />
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href="/institution/login"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to login
        </a>
        <a
          href="/institution"
          className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{sub}</p>
    </div>
  );
}
