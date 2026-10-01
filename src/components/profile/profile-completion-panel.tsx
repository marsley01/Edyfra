"use client";

import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { updateStudentProfile } from "@/app/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTIES, STUDY_STYLES, SUBJECTS, getYearOptions } from "@/lib/onboarding-options";
import { profileFieldLabel, type ProfileStatus } from "@/lib/profile-completion";

interface Props {
  status: ProfileStatus;
  defaults: {
    name: string;
    educationLevel: string;
    curriculum: string;
    formYear: number | null;
    county: string;
    subjects: string[];
    weakTopics: string[];
    studyStyle: string;
  };
}

/**
 * Lets an account that abandoned onboarding finish it from Profile settings
 * instead of being trapped in the wizard. Only the fields the account is
 * actually missing are rendered, so a user who got through most of the flow is
 * not asked to re-answer everything.
 */
export function ProfileCompletionPanel({ status, defaults }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: defaults.name,
    educationLevel: defaults.educationLevel || "HIGH_SCHOOL",
    curriculum: defaults.curriculum || "8-4-4",
    formYear: defaults.formYear ? String(defaults.formYear) : "",
    county: defaults.county || "",
    subjects: defaults.subjects,
    weakTopics: defaults.weakTopics,
    studyStyle: defaults.studyStyle,
  });

  const missing = useMemo(() => new Set(status.missing), [status.missing]);
  const isTutor = status.kind === "TUTOR";

  const yearOptions = useMemo(
    () => getYearOptions(form.educationLevel, form.curriculum),
    [form.educationLevel, form.curriculum],
  );

  const toggleIn = (field: "subjects" | "weakTopics", value: string) => {
    setForm((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const stillMissing = status.missing.filter((field) => {
    switch (field) {
      case "name":
        return !form.name.trim();
      case "county":
        return !form.county;
      case "formYear":
        return !form.formYear;
      case "subjects":
        return form.subjects.length === 0;
      case "weakTopics":
        return form.weakTopics.length === 0;
      case "studyStyle":
        return !form.studyStyle;
      default:
        return false;
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStudentProfile({
        name: form.name,
        educationLevel: form.educationLevel,
        curriculum: form.curriculum,
        formYear: form.formYear ? Number(form.formYear) : undefined,
        county: form.county,
        subjects: form.subjects,
        weakTopics: form.weakTopics,
        studyStyle: form.studyStyle,
      });
      toast.success("Profile updated", {
        description: "You can keep editing these details any time.",
      });
      router.refresh();
    } catch {
      toast.error("Could not save your profile", {
        description: "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isTutor) {
    return (
      <Card className="border-2 border-amber-500/30 bg-amber-500/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Finish your tutor profile
          </CardTitle>
          <CardDescription>
            You started applying as a tutor but haven&apos;t finished. Pick up
            where you left off — your progress is saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={status.percent} className="h-2" />
          <ul className="space-y-2">
            {status.missing.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {profileFieldLabel(field)}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => router.push("/tutor/settings")}
            className="rounded-xl bg-primary text-white"
          >
            Continue in tutor settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5 rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Finish setting up your profile
        </CardTitle>
        <CardDescription>
          You&apos;re {status.percent}% done. Complete the details below to get
          matched with tutors and study material — you can return to this page
          any time to update them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Progress value={status.percent} className="h-2" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {status.missing.map((field) => (
              <Badge key={field} variant="secondary" className="text-[10px] font-bold uppercase tracking-wide">
                {profileFieldLabel(field)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {missing.has("name") && (
            <div className="space-y-2">
              <Label>Your name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="rounded-xl border-primary/10"
              />
            </div>
          )}

          {(missing.has("educationLevel") || missing.has("curriculum")) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Education level</Label>
                <Select
                  value={form.educationLevel}
                  onValueChange={(v) => setForm({ ...form, educationLevel: v ?? "HIGH_SCHOOL", formYear: "" })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                    <SelectItem value="UNIVERSITY">University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.educationLevel !== "UNIVERSITY" && (
                <div className="space-y-2">
                  <Label>Curriculum</Label>
                  <Select
                    value={form.curriculum}
                    onValueChange={(v) => setForm({ ...form, curriculum: v ?? "8-4-4", formYear: "" })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8-4-4">8-4-4</SelectItem>
                      <SelectItem value="CBC">CBC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {missing.has("formYear") && (
            <div className="space-y-2">
              <Label>Form / grade</Label>
              <Select value={form.formYear} onValueChange={(v) => setForm({ ...form, formYear: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select your class" /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {missing.has("county") && (
            <div className="space-y-2">
              <Label>County</Label>
              <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v ?? "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select your zone" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {missing.has("subjects") && (
            <div className="space-y-2">
              <Label>Subjects you want help with</Label>
              <ChipGrid
                options={SUBJECTS}
                selected={form.subjects}
                onToggle={(v) => toggleIn("subjects", v)}
              />
            </div>
          )}

          {missing.has("weakTopics") && (
            <div className="space-y-2">
              <Label>Topics you find difficult</Label>
              <ChipGrid
                options={SUBJECTS}
                selected={form.weakTopics}
                onToggle={(v) => toggleIn("weakTopics", v)}
              />
            </div>
          )}

          {missing.has("studyStyle") && (
            <div className="space-y-2">
              <Label>How you like to study</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STUDY_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, studyStyle: s.value })}
                    className={`rounded-xl border px-3 py-3 text-xs font-bold uppercase tracking-wide transition-all ${
                      form.studyStyle === s.value
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || stillMissing.length > 0}
          className="w-full rounded-xl bg-primary text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" /> Save profile
            </>
          )}
        </Button>

        {stillMissing.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Still needed: {stillMissing.map(profileFieldLabel).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
              active
                ? "border-primary bg-primary text-white"
                : "border-border hover:border-primary/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
