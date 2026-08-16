"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Shield, Zap, Globe, 
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
import { showError, showSuccess } from "@/lib/toast";
import { resetAllSessions, clearGlobalCache, deleteUser, saveAdminGlobalSettings, getAdminGlobalSettings } from "@/app/actions/admin";
import { updateUserPreferences } from "@/app/actions/user";
import { Palette, Eye, EyeOff } from "lucide-react";

export default function AdminSettingsPage() {
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [googleAiKey, setGoogleAiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationGate, setRegistrationGate] = useState(true);
  const [dataCluster, setDataCluster] = useState("eu-central");
  const [aiProvider, setAiProvider] = useState("auto");
  const [aiMatchmaking, setAiMatchmaking] = useState(true);
  const [pointsMultiplier, setPointsMultiplier] = useState("1x");
  const [tutorEarnings, setTutorEarnings] = useState(true);

  type AdminGlobalSettings = {
    googleAiKey?: string;
    accentColor?: string;
    maintenanceMode?: boolean;
    registrationGate?: boolean;
    dataCluster?: string;
    aiProvider?: string;
    aiMatchmaking?: boolean;
    pointsMultiplier?: string;
    tutorEarnings?: boolean;
  };

  const loadSettings = useCallback(async () => {
    try {
      const rawSettings = await getAdminGlobalSettings();
      const settings = rawSettings as AdminGlobalSettings | undefined;
      if (settings?.googleAiKey) setGoogleAiKey(settings.googleAiKey);
      if (settings?.accentColor) setAccentColor(settings.accentColor);
      if (settings?.maintenanceMode !== undefined) setMaintenanceMode(settings.maintenanceMode);
      if (settings?.registrationGate !== undefined) setRegistrationGate(settings.registrationGate);
      if (settings?.dataCluster) setDataCluster(settings.dataCluster);
      if (settings?.aiProvider) setAiProvider(settings.aiProvider);
      if (settings?.aiMatchmaking !== undefined) setAiMatchmaking(settings.aiMatchmaking);
      if (settings?.pointsMultiplier) setPointsMultiplier(settings.pointsMultiplier);
      if (settings?.tutorEarnings !== undefined) setTutorEarnings(settings.tutorEarnings);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (!confirm("WARNING: This will permanently delete the user and all associated data. Proceed?")) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete);
      showSuccess("User deleted", { description: "The account and its data are gone from the database." });
      setUserToDelete("");
    } catch (err) {
      showError({
        title: "We couldn't delete that user",
        cause: "The ID may be wrong, or your permissions are limited.",
        fix: "Double-check the ID, then try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save to User Settings (Local)
      await updateUserPreferences({ accentColor });
      
      // 2. Save to Global Settings (API Keys, etc)
      await saveAdminGlobalSettings({ 
        googleAiKey,
        accentColor,
        maintenanceMode,
        registrationGate,
        dataCluster,
        aiProvider,
        aiMatchmaking,
        pointsMultiplier,
        tutorEarnings,
        updatedAt: new Date().toISOString()
      });
      
      // Dispatch event for instant preview
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("accent-color-changed", { detail: accentColor }));
      }
      
      showSuccess("System configurations deployed", { description: "The new settings are live across the platform." });
    } catch (err) {
      showError({
        title: "We couldn't deploy those configurations",
        cause: "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Platform Settings</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Manage global platform settings and AI configurations.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-2xl font-black gap-2 h-14 px-10 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          SAVE SETTINGS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General Settings */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">General Settings</CardTitle>
            </div>
            <CardDescription>Control site availability and user registration.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <Label className="text-lg font-black tracking-tight">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground font-medium">Redirect all traffic to a maintenance splash page.</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <Label className="text-lg font-black tracking-tight">Registration Gate</Label>
                <p className="text-sm text-muted-foreground font-medium">Require invite codes for new scholars.</p>
              </div>
              <Switch checked={registrationGate} onCheckedChange={setRegistrationGate} />
            </div>
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Server Region</Label>
              <Select value={dataCluster} onValueChange={(value) => setDataCluster(value || 'eu-central')}>
                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eu-central">Europe (Frankfurt)</SelectItem>
                  <SelectItem value="us-east">North America (N. Virginia)</SelectItem>
                  <SelectItem value="af-south">Africa (Cape Town)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Configurations */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Cpu className="h-6 w-6 text-purple-400" />
              <CardTitle className="text-2xl font-black">AI Configurations</CardTitle>
            </div>
            <CardDescription>Manage API keys and AI features.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4 p-6 rounded-3xl bg-purple-500/5 border border-purple-500/20">
               <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-black uppercase tracking-widest text-purple-400">OpenRouter API Key</Label>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowKey(!showKey)}
                    className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
               </div>
               <Input 
                 type={showKey ? "text" : "password"}
                 placeholder="AIzaSy..." 
                 value={googleAiKey}
                 onChange={(e) => setGoogleAiKey(e.target.value)}
                 className="h-12 rounded-xl bg-black/40 border-white/10 font-mono text-xs tracking-widest"
               />
               <p className="text-[10px] text-muted-foreground mt-3 italic">This key connects your platform to OpenRouter for AI features.</p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary AI Provider</Label>
              <Select value={aiProvider} onValueChange={(value) => setAiProvider(value || 'auto')}>
                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini 1.5 Pro (Optimized)</SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4o (Legacy Fallback)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight">AI Matchmaking</Label>
                 <p className="text-sm text-muted-foreground font-medium">Use AI to suggest best tutor-student pairs.</p>
               </div>
               <Switch checked={aiMatchmaking} onCheckedChange={setAiMatchmaking} />
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
              <Select value={pointsMultiplier} onValueChange={(value) => setPointsMultiplier(value || '1x')}>
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
               <Switch checked={tutorEarnings} onCheckedChange={setTutorEarnings} />
            </div>
          </CardContent>
        </Card>

        {/* Brand & Aesthetics */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <Palette className="h-6 w-6 text-pink-500" />
              <CardTitle className="text-2xl font-black">Brand & Aesthetics</CardTitle>
            </div>
            <CardDescription>Customize the platform&apos;s primary visual identity.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary Accent Color</Label>
              <div className="flex items-center gap-6">
                <input 
                  type="color" 
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-14 h-14 rounded-2xl cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="space-y-1">
                  <p className="font-black font-mono text-lg tracking-widest">{accentColor.toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Hex Code</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Tools */}
        <Card className="border-white/5 bg-black rounded-[2.5rem] overflow-hidden border-2 border-primary/20">
          <CardHeader className="p-10 bg-primary/5">
            <div className="flex items-center gap-4 mb-2">
              <Terminal className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-black">System Actions</CardTitle>
            </div>
            <CardDescription className="text-primary/60">Administrative tools and cache management.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const { reindexDatabase } = await import("@/app/actions/admin");
                      await reindexDatabase();
                      showSuccess("Database reindexed", { description: "Search and filters should feel snappier now." });
                    } catch (error) {
                      showError({
                        title: "We couldn't reindex the database",
                        cause: "Something didn't go through on our side.",
                        fix: "Try again, or refresh the page.",
                      });
                    }
                  }}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <Database className="h-5 w-5" /> REINDEX DATABASE
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (confirm("Are you sure you want to log out all users?")) {
                      await resetAllSessions();
                      showSuccess("All users logged out", { description: "Every active session has been cleared." });
                    }
                  }}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <Lock className="h-5 w-5" /> RESET ALL SESSIONS
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await clearGlobalCache();
                    showSuccess("Global cache flushed", { description: "Fresh data will be fetched on the next request." });
                  }}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <RefreshCw className="h-5 w-5" /> CLEAR GLOBAL CACHE
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const { bootstrapSeeds } = await import("@/app/actions/admin");
                      await bootstrapSeeds();
                      showSuccess("Seeds bootstrapped", { description: "Demo data is now in place." });
                    } catch (error) {
                      showError({
                        title: "We couldn't bootstrap the seeds",
                        cause: "Something didn't go through on our side.",
                        fix: "Try again, or refresh the page.",
                      });
                    }
                  }}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <Rocket className="h-5 w-5" /> BOOTSTRAP SEEDS
                </Button>
              </div>
          </CardContent>
        </Card>

        {/* Administrator Actions */}
        <Card className="lg:col-span-2 border-red-500/20 bg-red-500/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.05)]">
          <CardHeader className="p-10 border-b border-red-500/10">
            <div className="flex items-center gap-4 mb-2">
              <Shield className="h-6 w-6 text-red-500" />
              <CardTitle className="text-2xl font-black text-red-500">Administrator Actions</CardTitle>
            </div>
            <CardDescription className="text-red-400/80">These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 rounded-3xl bg-black/40 border border-red-500/20">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight text-white">Delete User</Label>
                 <p className="text-xs text-muted-foreground font-medium">Permanently remove a user account from the platform.</p>
               </div>
               <div className="flex gap-2">
                 <Input 
                   placeholder="Enter exact User ID..." 
                   className="rounded-xl border-white/10 bg-white/5" 
                   value={userToDelete}
                   onChange={(e) => setUserToDelete(e.target.value)}
                 />
                 <Button 
                   onClick={handleDeleteUser} 
                   disabled={isDeleting || !userToDelete} 
                   variant="destructive" 
                   className="rounded-xl px-6 font-black tracking-widest"
                 >
                   {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "DELETE"}
                 </Button>
               </div>
            </div>

            <div className="space-y-4 p-6 rounded-3xl bg-black/40 border border-red-500/20">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight text-white">Emergency Logout</Label>
                 <p className="text-xs text-muted-foreground font-medium">Force all active users to log out immediately.</p>
               </div>
               <div className="flex gap-2">
                  <Button onClick={() => {
                    if (confirm("Are you sure you want to force logout all users?")) {
                      resetAllSessions().then(() => showSuccess("All users logged out", { description: "Every active session has been cleared." }));
                    }
                  }} variant="outline" className="flex-1 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 font-black">
                   <Lock className="h-4 w-4 mr-2" /> FORCE LOGOUT
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
