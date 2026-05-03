"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, Shield, Zap, Globe, 
  Terminal, Database, Save, RefreshCw,
  Cpu, Lock, Rocket
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("System configurations deployed successfully");
    }, 1500);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">System Config</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Master environment variables & platform gates.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-2xl font-black gap-2 h-14 px-10 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          DEPLOY CHANGES
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Infrastructure */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">Core Infrastructure</CardTitle>
            </div>
            <CardDescription>Global platform availability and access gates.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <Label className="text-lg font-black tracking-tight">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground font-medium">Redirect all traffic to a maintenance splash page.</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <Label className="text-lg font-black tracking-tight">Registration Gate</Label>
                <p className="text-sm text-muted-foreground font-medium">Require invite codes for new scholars.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary Data Cluster</Label>
              <Select defaultValue="eu-central">
                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eu-central">EU Central (Frankfurt)</SelectItem>
                  <SelectItem value="us-east">US East (N. Virginia)</SelectItem>
                  <SelectItem value="af-south">AF South (Cape Town)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Neural Engine (AI) Settings */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Cpu className="h-6 w-6 text-purple-400" />
              <CardTitle className="text-2xl font-black">Neural Engine</CardTitle>
            </div>
            <CardDescription>Configure AI matching and automated tutoring logic.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary AI Provider</Label>
              <Select defaultValue="gemini">
                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini 1.5 Pro (Optimized)</SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4o (Legacy Fallback)</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude 3.5 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight">AI Matchmaking</Label>
                 <p className="text-sm text-muted-foreground font-medium">Use AI to suggest the best tutor-student pairs.</p>
               </div>
               <Switch defaultChecked />
            </div>
            <div className="space-y-4">
               <Label className="text-sm font-black uppercase tracking-widest">AI Response Creativity (Temperature)</Label>
               <div className="flex items-center gap-6">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full w-[40%] bg-purple-500" />
                  </div>
                  <span className="font-black text-purple-400">0.4</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Economy & Rewards */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Zap className="h-6 w-6 text-orange-400" />
              <CardTitle className="text-2xl font-black">Platform Economy</CardTitle>
            </div>
            <CardDescription>Adjust point rewards and scholarship multipliers.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Global Points Multiplier</Label>
              <Select defaultValue="1x">
                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold text-orange-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x">1.0x (Standard)</SelectItem>
                  <SelectItem value="1.5x">1.5x (Weekend Bonus)</SelectItem>
                  <SelectItem value="2x">2.0x (Event Boost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight">Tutor Earnings Access</Label>
                 <p className="text-sm text-muted-foreground font-medium">Allow tutors to request withdrawals.</p>
               </div>
               <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Terminal */}
        <Card className="border-white/5 bg-black rounded-[2.5rem] overflow-hidden border-2 border-primary/20">
          <CardHeader className="p-10 bg-primary/5">
            <div className="flex items-center gap-4 mb-2">
              <Terminal className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">Advanced Terminal</CardTitle>
            </div>
            <CardDescription className="text-primary/60">Dangerous operations. Execute with caution.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-black text-xs tracking-widest flex flex-col gap-2">
                   <Database className="h-5 w-5" /> REINDEX DATABASE
                </Button>
                <Button variant="outline" className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-black text-xs tracking-widest flex flex-col gap-2">
                   <Lock className="h-5 w-5" /> RESET ALL SESSIONS
                </Button>
                <Button variant="outline" className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 font-black text-xs tracking-widest flex flex-col gap-2">
                   <RefreshCw className="h-5 w-5" /> CLEAR GLOBAL CACHE
                </Button>
                <Button variant="outline" className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 font-black text-xs tracking-widest flex flex-col gap-2">
                   <Rocket className="h-5 w-5" /> BOOTSTRAP SEEDS
                </Button>
             </div>
             <p className="text-[9px] font-black text-muted-foreground uppercase text-center tracking-[0.3em] pt-4 animate-pulse">
                System Status: Authenticated Admin Required
             </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
