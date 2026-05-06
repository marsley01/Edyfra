"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import { resetAllSessions, clearGlobalCache, deleteUser, saveAdminGlobalSettings, getAdminGlobalSettings } from "@/app/actions/admin";
import { updateUserSettings } from "@/app/actions/user";
import { Palette, Trash2, Skull, Eye, EyeOff } from "lucide-react";

export default function AdminSettingsPage() {
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [googleAiKey, setGoogleAiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

   const loadSettings = async () => {
     try {
       const rawSettings = await getAdminGlobalSettings();
       const settings = rawSettings as Record<string, any> | undefined;
       if (settings?.googleAiKey) setGoogleAiKey(settings.googleAiKey);
       if (settings?.accentColor) setAccentColor(settings.accentColor);
     } catch (err) {
       console.error("Failed to load settings:", err);
     } finally {
       setLoading(false);
     }
   };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (!confirm("WARNING: This will permanently delete the user and all associated data. Proceed?")) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete);
      toast.success("Target user successfully eradicated from the database.");
      setUserToDelete("");
    } catch (err) {
      toast.error("Failed to delete user. Check ID or permissions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save to User Settings (Local)
      await updateUserSettings({ accentColor });
      
      // 2. Save to Global Settings (API Keys, etc)
      await saveAdminGlobalSettings({ 
        googleAiKey,
        accentColor,
        updatedAt: new Date().toISOString()
      });
      
      // Dispatch event for instant preview
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("accent-color-changed", { detail: accentColor }));
      }
      
      toast.success("System configurations deployed successfully");
    } catch (err) {
      toast.error("Failed to deploy configurations");
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
            <div className="space-y-4 p-6 rounded-3xl bg-purple-500/5 border border-purple-500/20">
               <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-black uppercase tracking-widest text-purple-400">Google Gemini API Key</Label>
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
               <p className="text-[10px] text-muted-foreground mt-3 italic">This key enables Mash AI across all study sessions. Updates are instant.</p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest">Primary AI Provider</Label>
              <Select defaultValue="gemini">
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
                 <p className="text-sm text-muted-foreground font-medium">Use AI to suggest the best tutor-student pairs.</p>
               </div>
               <Switch defaultChecked />
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
                <Button 
                  variant="outline" 
                  onClick={() => toast.info("Reindexing initiated...")}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <Database className="h-5 w-5" /> REINDEX DATABASE
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (confirm("TERRIBLE WARNING: This will wipe ALL sessions. Proceed?")) {
                      await resetAllSessions();
                      toast.success("Network Purge Complete");
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
                    toast.success("Global Cache Flushed");
                  }}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <RefreshCw className="h-5 w-5" /> CLEAR GLOBAL CACHE
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => toast.info("Bootstrapping seeds...")}
                  className="rounded-2xl h-20 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 font-black text-xs tracking-widest flex flex-col gap-2"
                >
                   <Rocket className="h-5 w-5" /> BOOTSTRAP SEEDS
                </Button>
              </div>
          </CardContent>
        </Card>

        {/* God Mode & Dangerous Actions */}
        <Card className="lg:col-span-2 border-red-500/20 bg-red-500/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.05)]">
          <CardHeader className="p-10 border-b border-red-500/10">
            <div className="flex items-center gap-4 mb-2">
              <Skull className="h-6 w-6 text-red-500" />
              <CardTitle className="text-2xl font-black text-red-500">God Mode</CardTitle>
            </div>
            <CardDescription className="text-red-400/80">Extreme danger. Actions here are immediate and irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 rounded-3xl bg-black/40 border border-red-500/20">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight text-white">Eradicate User</Label>
                 <p className="text-xs text-muted-foreground font-medium">Permanently delete a user via their ID.</p>
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
                   {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "PURGE"}
                 </Button>
               </div>
            </div>

            <div className="space-y-4 p-6 rounded-3xl bg-black/40 border border-red-500/20">
               <div className="space-y-1">
                 <Label className="text-lg font-black tracking-tight text-white">Global Reset Protocol</Label>
                 <p className="text-xs text-muted-foreground font-medium">Wipe all active study sessions and caches instantly.</p>
               </div>
               <div className="flex gap-2">
                 <Button onClick={() => {
                   if (confirm("Reset ALL sessions?")) {
                     resetAllSessions().then(() => toast.success("Sessions annihilated."));
                   }
                 }} variant="outline" className="flex-1 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 font-black">
                   <Zap className="h-4 w-4 mr-2" /> KILL SESSIONS
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
