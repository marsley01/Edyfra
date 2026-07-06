"use client";

import { useEffect, useState } from "react";
import { Cpu, Eye, EyeOff, RefreshCw, Save, Sparkles } from "lucide-react";
import { showError, showSuccess, showUnknownError } from "@/lib/toast";
import { saveAdminGlobalSettings, getAdminGlobalSettings } from "@/app/actions/admin";
import type { AdminGlobalSettings } from "@/app/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminAISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [baseSettings, setBaseSettings] = useState<AdminGlobalSettings>({});
  const [googleAiKey, setGoogleAiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("auto");
  const [aiMatchmaking, setAiMatchmaking] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAdminGlobalSettings();
        setBaseSettings(settings);
        setGoogleAiKey(typeof settings.googleAiKey === "string" ? settings.googleAiKey : "");
        setAiProvider(typeof settings.aiProvider === "string" ? settings.aiProvider : "auto");
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

  const handleSave = async () => {
    setSaving(true);

    try {
      const nextSettings: AdminGlobalSettings = {
        ...baseSettings,
        googleAiKey,
        aiProvider,
        aiMatchmaking,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveAdminGlobalSettings(nextSettings);
      if (result?.error) {
        throw new Error(result.error);
      }

      setBaseSettings(nextSettings);
      showSuccess("AI engine settings saved", { description: "The new model is live across the platform." });
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
            Manage the provider, key, and core automation behavior behind Mash AI.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-14 rounded-2xl bg-primary px-8 font-black uppercase tracking-widest"
        >
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save AI Settings
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[2.5rem] border-border/5 bg-background/[0.02] backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 p-10">
            <div className="mb-2 flex items-center gap-4">
              <Cpu className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">Provider Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how Edyfra powers AI-generated matching, support, and challenge workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-10">
            <div className="space-y-4 rounded-[2rem] border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black uppercase tracking-widest text-primary">Google Gemini API Key</Label>
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
                value={googleAiKey}
                onChange={(event) => setGoogleAiKey(event.target.value)}
                placeholder="AIzaSy..."
                className="h-12 rounded-xl border-border/10 bg-background/40 font-mono text-xs tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                This key is used for Edyfra AI experiences that rely on the configured Gemini pipeline.
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary AI Provider</Label>
              <Select value={aiProvider} onValueChange={(value) => setAiProvider(value || "auto")}>
                <SelectTrigger className="h-14 rounded-2xl border-border/10 bg-background/5 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic Routing</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
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
            <CardTitle className="text-2xl font-black tracking-tight">What this page controls</CardTitle>
            <CardDescription className="text-white/50">
              Quick access to the settings behind Edyfra&apos;s AI layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-10 pb-10">
            {[
              "AI provider selection for platform-wide workflows",
              "Secure storage and rotation of the Gemini API key",
              "Matchmaking behavior for tutor-student recommendations",
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
