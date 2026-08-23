"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Sparkles,
  CheckCircle2,
  XCircle,
  CloudUpload,
  FlaskConical,
} from "lucide-react";
import { showError, showSuccess, showUnknownError } from "@/lib/toast";
import {
  saveAISettings,
  getAdminGlobalSettings,
  testOpenRouterKey,
  type AdminGlobalSettings,
} from "@/app/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MODEL_OPTIONS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (recommended)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free tier)" },
  { id: "z-ai/glm-5.2:free", label: "GLM 5.2 (free tier)" },
];

type TestResult =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "ok"; label?: string; usage?: number; limit?: number }
  | { state: "fail"; error: string };

export default function AdminAISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [baseSettings, setBaseSettings] = useState<AdminGlobalSettings>({});
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash");
  const [aiMatchmaking, setAiMatchmaking] = useState(true);
  const [testResult, setTestResult] = useState<TestResult>({ state: "idle" });
  const [vercelMessage, setVercelMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAdminGlobalSettings();
        setBaseSettings(settings);
        const savedKey =
          typeof settings.openRouterKey === "string" && settings.openRouterKey
            ? settings.openRouterKey
            : typeof settings.googleAiKey === "string"
              ? settings.googleAiKey
              : "";
        setOpenRouterKey(savedKey);
        setAiModel(typeof settings.aiModel === "string" && settings.aiModel ? settings.aiModel : "google/gemini-2.5-flash");
        setAiMatchmaking(typeof settings.aiMatchmaking === "boolean" ? settings.aiMatchmaking : true);
      } catch (error) {
        console.error("Failed to load AI settings:", error);
        showError({
          title: "We couldn't load AI settings",
          cause: "A hiccup on our side blocked the load.",
          fix: "Try again, or refresh the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleTest = async () => {
    setTestResult({ state: "testing" });
    try {
      const res = await testOpenRouterKey(openRouterKey.trim() || undefined);
      if (res.ok) {
        setTestResult({ state: "ok", label: res.label, usage: res.usage, limit: res.limit });
      } else {
        setTestResult({ state: "fail", error: res.error });
      }
    } catch (error) {
      setTestResult({
        state: "fail",
        error: error instanceof Error ? error.message : "Unexpected error testing key.",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setVercelMessage(null);

    try {
      const nextSettings: AdminGlobalSettings = {
        ...baseSettings,
        // Clear the legacy field once a proper OpenRouter key is stored.
        googleAiKey: openRouterKey.startsWith("sk-or-") ? "" : openRouterKey,
        openRouterKey,
        aiModel,
        aiProvider: "openrouter",
        aiMatchmaking,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveAISettings(nextSettings);
      if (result?.error) {
        throw new Error(result.error);
      }

      setBaseSettings(nextSettings);
      setVercelMessage(result.vercelMessage ?? null);
      showSuccess("AI engine settings saved", {
        description: result.vercelSync
          ? "Live instantly — Vercel env updated too."
          : "Live instantly across the platform.",
      });
    } catch (error) {
      showError({
        title: "We couldn't save AI settings",
        cause: error instanceof Error ? error.message : "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI Engine
          </div>
          <h1 className="text-5xl font-black tracking-tighter">AI Provider Settings</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            One OpenRouter key powers Mash, Eddy, insights, challenges, and institution AI.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-14 rounded-2xl bg-primary px-8 font-black uppercase tracking-widest"
        >
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save &amp; Sync
        </Button>
      </div>

      {vercelMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 text-sm font-medium text-primary">
          <CloudUpload className="h-4 w-4 shrink-0" />
          {vercelMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[2.5rem] border-border/5 bg-background/[0.02] backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 p-10">
            <div className="mb-2 flex items-center gap-4">
              <Cpu className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">OpenRouter</CardTitle>
            </div>
            <CardDescription>
              Edyfra routes every AI feature through OpenRouter. Paste a key from
              openrouter.ai/keys — it goes live platform-wide the moment you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-10">
            <div className="space-y-4 rounded-[2rem] border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black uppercase tracking-widest text-primary">API Key</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey((current) => !current)}
                  className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Input
                type={showKey ? "text" : "password"}
                value={openRouterKey}
                onChange={(event) => setOpenRouterKey(event.target.value)}
                placeholder="sk-or-v1-..."
                className="h-12 rounded-xl border-border/10 bg-background/40 font-mono text-xs tracking-widest"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testResult.state === "testing" || !openRouterKey.trim()}
                  className="rounded-xl"
                >
                  {testResult.state === "testing" ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="mr-2 h-4 w-4" />
                  )}
                  Test Key
                </Button>

                {testResult.state === "ok" && (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Working{testResult.label ? ` — ${testResult.label}` : ""}
                    {typeof testResult.usage === "number" &&
                      ` · $${(testResult.usage / 100).toFixed(2)} used${typeof testResult.limit === "number" ? ` of $${(testResult.limit / 100).toFixed(2)}` : ""}`}
                  </span>
                )}
                {testResult.state === "fail" && (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                    <XCircle className="h-4 w-4" />
                    {testResult.error}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Saving stores the key securely and pushes it to Vercel automatically when
                VERCEL_API_TOKEN / VERCEL_PROJECT_ID are configured.
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Default Model</Label>
              <Select value={aiModel} onValueChange={(value) => setAiModel(value || "google/gemini-2.5-flash")}>
                <SelectTrigger className="h-14 rounded-2xl border-border/10 bg-background/5 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used by chatbots, insights, challenge generation, and institution analytics.
                If a model hits rate limits, traffic automatically fails over to the free tier.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-[2rem] border border-white/5 bg-white/5 p-6">
              <div className="space-y-1">
                <Label className="text-lg font-black tracking-tight">AI Matchmaking</Label>
                <p className="text-sm font-medium text-muted-foreground">
                  Use AI signals to improve tutor and student pairing suggestions.
                </p>
              </div>
              <Switch checked={aiMatchmaking} onCheckedChange={setAiMatchmaking} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-border/5 bg-background text-foreground">
          <CardHeader className="p-10">
            <CardTitle className="text-2xl font-black tracking-tight">How this works</CardTitle>
            <CardDescription className="text-muted-foreground">
              The AI pipeline behind every Edyfra experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-10 pb-10">
            {[
              "Saving applies the new key within seconds — chatbots, insights, and generators read it live from the database.",
              "With VERCEL_API_TOKEN and VERCEL_PROJECT_ID set, the key is also pushed to your Vercel project for future deploys.",
              "Rate limits stay protected: per-user throttling and daily budgets keep applying no matter which key is active.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border/10 bg-background/5 p-5 text-sm font-medium text-foreground/80">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
