"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";
import { submitInstitutionApplication } from "@/app/actions/institution-signup";
import { INSTITUTION_PLANS, type PlanDefinition } from "@/lib/institution-plans";
import { KENYA_COUNTIES } from "@/lib/kenya-counties";

const STEPS = [
  { id: 1, title: "School", description: "About the institution" },
  { id: 2, title: "Account", description: "Primary admin details" },
  { id: 3, title: "Plan", description: "Choose and confirm" },
];

const COUNTIES = KENYA_COUNTIES.map((c) => ({ name: c.name, subCounties: c.subCounties }));

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
        "flex h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium text-white shadow-sm focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
        disabled && "cursor-not-allowed opacity-40",
        !value && "text-neutral-500",
      )}
    >
      <option value="" className="bg-[#0a0a0f]">{placeholder ?? "Select"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0a0a0f]">
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

export default function InstitutionsSignup() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const subCounties = useMemo(
    () => COUNTIES.find((c) => c.name === form.county)?.subCounties ?? [],
    [form.county],
  );

  const plan = INSTITUTION_PLANS.find((p) => p.tier === form.plan)!;

  function canAdvance(s: number): { ok: boolean; reason?: string } {
    if (s === 1) {
      if (!form.schoolName.trim()) return { ok: false, reason: "School name is required" };
      if (!form.schoolType) return { ok: false, reason: "Choose a school type" };
      if (!form.curriculum) return { ok: false, reason: "Choose a curriculum" };
      if (!form.county) return { ok: false, reason: "Choose a county" };
      if (!form.subCounty) return { ok: false, reason: "Choose a sub-county" };
      if (!form.studentCount) return { ok: false, reason: "Number of students is required" };
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
        fix: "Fill in the highlighted fields, then continue.",
      });
      return;
    }
    if (step < 3) {
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
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-xl font-black text-white">Application received</h1>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Thank you for applying on behalf of <span className="text-white font-semibold">{form.schoolName}</span>.
              The Edyfra team will review your details and contact{" "}
              <span className="text-white font-semibold">{form.adminEmail}</span> within 24 hours.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="/institution/login"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Go to login
              </a>
              <a
                href="/institutions/signup"
                className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Submit another application
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Branding header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Building2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Edyfra Institutions</h1>
            <p className="text-xs text-neutral-500">Bring your school onto Edyfra</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all",
                      done && "bg-indigo-500/20 text-indigo-400",
                      active && "bg-indigo-600 text-white ring-2 ring-indigo-500/30",
                      !done && !active && "bg-white/5 text-neutral-600",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <p className={cn("text-xs font-bold", active ? "text-white" : "text-neutral-500")}>{s.title}</p>
                    <p className="text-[10px] text-neutral-600">{s.description}</p>
                  </div>
                </div>
                {s.id < STEPS.length && (
                  <div className={cn("flex-1 h-px", done ? "bg-indigo-500/30" : "bg-white/5")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* STEP 1: School */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-black text-white">School details</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">Tell us about the institution you&apos;re bringing onto Edyfra.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>School name</Label>
                      <Input
                        value={form.schoolName}
                        onChange={(e) => update("schoolName", e.target.value)}
                        placeholder="e.g. Nairobi Academy"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>School type</Label>
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
                    </div>
                    <div className="space-y-1.5">
                      <Label>Curriculum</Label>
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
                    </div>
                    <div className="space-y-1.5">
                      <Label>County</Label>
                      <Select
                        value={form.county}
                        onChange={(v) => {
                          update("county", v);
                          update("subCounty", "");
                        }}
                        placeholder="Select county"
                        options={COUNTIES.map((c) => ({ value: c.name, label: c.name }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sub-county</Label>
                      <Select
                        value={form.subCounty}
                        onChange={(v) => update("subCounty", v)}
                        placeholder={form.county ? "Select sub-county" : "Pick a county first"}
                        options={subCounties.map((s) => ({ value: s, label: s }))}
                        disabled={!form.county}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Approximate students</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.studentCount}
                        onChange={(e) => update("studentCount", e.target.value)}
                        placeholder="e.g. 350"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Admin */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-black text-white">Admin account</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      This person will be the primary admin and receive login access once approved.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Full name</Label>
                      <Input
                        value={form.adminName}
                        onChange={(e) => update("adminName", e.target.value)}
                        placeholder="e.g. Jane Wanjiku"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Title</Label>
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
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.adminEmail}
                        onChange={(e) => update("adminEmail", e.target.value)}
                        placeholder="admin@school.ac.ke"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                      <p className="text-[10px] text-neutral-600">Professional email required. Becomes the login.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone number</Label>
                      <Input
                        type="tel"
                        value={form.adminPhone}
                        onChange={(e) => update("adminPhone", e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Create password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          placeholder="••••••••"
                          className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-600">At least 8 characters.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm password</Label>
                      <Input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => update("confirmPassword", e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Plan + Review */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-black text-white">Choose a plan</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">All plans include teachers, analytics, holiday coaching and reports.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {INSTITUTION_PLANS.map((p) => (
                      <button
                        key={p.tier}
                        type="button"
                        onClick={() => update("plan", p.tier as FormState["plan"])}
                        className={cn(
                          "relative flex flex-col rounded-xl border p-5 text-left transition-all",
                          form.plan === p.tier
                            ? "border-indigo-500/50 bg-indigo-500/5"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20",
                        )}
                      >
                        {p.popular && (
                          <span className="absolute -top-2 right-3 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                            Popular
                          </span>
                        )}
                        <h3 className="text-sm font-black text-white">{p.name}</h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{p.tagline}</p>
                        <p className="mt-3 text-xl font-black text-white">
                          KES {p.monthlyKsh.toLocaleString()}
                          <span className="text-xs font-medium text-neutral-500">/mo</span>
                        </p>
                        <p className="text-[10px] font-semibold text-indigo-400 mt-1">
                          {p.studentCap ? `Up to ${p.studentCap} students` : "Unlimited students"}
                        </p>
                        <ul className="mt-3 space-y-1">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5 text-[11px] text-neutral-400">
                              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  {/* Review summary */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Review summary</p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] text-neutral-600 uppercase tracking-wider">School</p>
                        <p className="text-white font-semibold">{form.schoolName}</p>
                        <p className="text-neutral-400 text-xs">{humanize(form.schoolType)} &middot; {humanize(form.curriculum)}</p>
                        <p className="text-neutral-400 text-xs">{form.county} &middot; {form.subCounty}</p>
                        <p className="text-neutral-400 text-xs">{form.studentCount} students</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Admin</p>
                        <p className="text-white font-semibold">{form.adminName}</p>
                        <p className="text-neutral-400 text-xs">{form.adminEmail}</p>
                        <p className="text-neutral-400 text-xs">{form.adminPhone}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Plan</p>
                      <p className="text-white font-semibold">{plan.name} &mdash; KES {plan.monthlyKsh.toLocaleString()}/mo</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
                    <p className="text-xs font-semibold text-indigo-300">What happens next?</p>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">&bull;</span>
                        The Edyfra founders review your application within 24 hours.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">&bull;</span>
                        Once approved, the admin receives a confirmation email with a login link.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">&bull;</span>
                        You can then start adding teachers and students from the dashboard.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              onClick={() => (step > 1 ? setStep(step - 1) : null)}
              disabled={step === 1}
              className={cn(
                "text-neutral-400 hover:text-white text-xs font-bold",
                step === 1 && "opacity-0 pointer-events-none",
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={submitting}
              className={cn(
                "h-10 px-5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]",
                step === 3
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/10 hover:bg-white/15 text-white",
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 3 ? (
                <>
                  Submit application
                  <ArrowRight className="ml-2 h-4 w-4" />
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

        {/* Footer */}
        <div className="text-center flex items-center justify-center gap-4 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Encrypted &amp; secure
          </span>
          <span className="text-white/5">&middot;</span>
          <Link href="/institutions/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
      {children}
    </span>
  );
}
