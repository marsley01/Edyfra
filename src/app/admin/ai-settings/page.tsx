"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Cpu, RotateCcw, Loader2, BarChart3, Sparkles, Shield, Activity } from "lucide-react";
import { toast } from "sonner";
import { AVAILABLE_MODELS } from "@/utils/openrouter";

export default function AISettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("model");
  const [blocklistInput, setBlocklistInput] = useState("");

  const load = async () => {
    const { getAllPlatformSettings, getAIUsageAnalytics } = await import("@/app/actions/admin-ai-settings");
    const [s, a] = await Promise.all([getAllPlatformSettings(), getAIUsageAnalytics()]);
    setSettings(s);
    setAnalytics(a);
    setBlocklistInput((s.safety_blocklist as string[])?.join("\n") || "");
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await checkAdminStatus())) { router.push("/dashboard"); return; }
      await load();
    };
    init();
  }, [router]);

  const save = async (key: string, value: any) => {
    const { setPlatformSetting } = await import("@/app/actions/admin-ai-settings");
    await setPlatformSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success("Saved");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const tabs = [
    { id: "model", label: "Model", icon: Cpu },
    { id: "personality", label: "Personality", icon: Sparkles },
    { id: "challenges", label: "Challenges", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "safety", label: "Safety", icon: Shield },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Cpu className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tighter">AI Engine</h1>
          <p className="text-muted-foreground font-medium mt-1">Configure Mash AI personality, model, and safety</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <Button key={t.id} onClick={() => setActiveTab(t.id)} variant={activeTab === t.id ? "default" : "outline"} className="rounded-xl">
            <t.icon className="h-4 w-4 mr-2" /> {t.label}
          </Button>
        ))}
      </div>

      {activeTab === "model" && (
        <Card className="rounded-[2rem] border-border/50">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-2">
              <Label className="font-black text-sm">AI Provider</Label>
              <Select value={settings.ai_provider as string || "auto"} onValueChange={(v) => save("ai_provider", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (OpenRouter → Gemini fallback)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter Only</SelectItem>
                  <SelectItem value="gemini">Google Gemini Direct</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Choose which AI backend powers Mash across the entire site</p>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-sm">Active AI Model</Label>
              <Select value={settings.active_ai_model as string || "google/gemini-2.0-flash-exp:free"} onValueChange={(v) => save("active_ai_model", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label} {m.costPer1K > 0 ? `(KSH ${(m.costPer1K * 130).toFixed(2)}/1K tokens)` : "(Free)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Changes apply immediately across all study sessions and Mash AI</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "personality" && (
        <Card className="rounded-[2rem] border-border/50">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="font-black text-sm">Mash System Prompt</Label>
              <Button onClick={() => save("mash_system_prompt", "You are Mash, Edyfra's AI study companion for Kenyan students. You are warm, encouraging, and focused. You only help with academic subjects. You never do homework for students — you guide them to the answer. You adapt your language to the student's education level. You are concise and clear. When a student is struggling, you break the problem into smaller steps. You celebrate small wins.")} variant="outline" size="sm" className="rounded-xl text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
              </Button>
            </div>
            <Textarea value={settings.mash_system_prompt as string || ""} onChange={(e) => setSettings((prev) => ({ ...prev, mash_system_prompt: e.target.value }))} className="rounded-xl min-h-[200px] font-mono text-sm" />
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{(settings.mash_system_prompt as string || "").length} characters</span>
              <Button onClick={() => save("mash_system_prompt", settings.mash_system_prompt)} className="rounded-xl">Save Prompt</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "challenges" && (
        <Card className="rounded-[2rem] border-border/50">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="font-black text-sm">AI Challenges</Label>
              <Switch checked={settings.challenges_enabled !== false} onCheckedChange={(v) => save("challenges_enabled", v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={settings.challenge_frequency as string || "daily"} onValueChange={(v) => save("challenge_frequency", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="every2days">Every 2 Days</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={settings.challenge_difficulty as string || "mixed"} onValueChange={(v) => save("challenge_difficulty", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points Per Challenge</Label>
                <Input type="number" value={settings.challenge_points as number || 50} onChange={(e) => save("challenge_points", parseInt(e.target.value) || 50)} className="rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "analytics" && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today", value: analytics.today },
            { label: "This Week", value: analytics.thisWeek },
            { label: "This Month", value: analytics.thisMonth },
            { label: "Total Tokens", value: analytics.totalTokens },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-2xl border-border/50">
              <CardContent className="p-6 space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-2 lg:col-span-4 rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.recentConversations?.slice(0, 10).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                    <span className="text-muted-foreground">{c.modelUsed}</span>
                    <span className="text-muted-foreground">{c.subject || "General"}</span>
                    <span className="text-muted-foreground">{c.tokenCount} tokens</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "safety" && (
        <Card className="rounded-[2rem] border-border/50">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="font-black text-sm">Refuse Off-topic Questions</Label>
              <Switch checked={settings.refuse_offtopic === true} onCheckedChange={(v) => save("refuse_offtopic", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-black text-sm">Safe Mode for Under-18</Label>
              <Switch checked={settings.safe_mode_under18 === true} onCheckedChange={(v) => save("safe_mode_under18", v)} />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-sm">Max Response Length: {settings.max_response_tokens as number || 500} tokens</Label>
              <Slider value={[settings.max_response_tokens as number || 500]} onValueChange={(v) => { if (typeof v === 'number') save("max_response_tokens", v); else if (Array.isArray(v) && v.length > 0) save("max_response_tokens", v[0]); }} min={100} max={1000} step={50} />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-sm">Blocklist (one word/phrase per line)</Label>
              <Textarea value={blocklistInput} onChange={(e) => setBlocklistInput(e.target.value)} className="rounded-xl min-h-[120px] font-mono text-sm" />
              <Button onClick={() => save("safety_blocklist", blocklistInput.split("\n").map((s) => s.trim()).filter(Boolean))} className="rounded-xl">Save Blocklist</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
