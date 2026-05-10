"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User, BookOpen, Loader2, Save, Bell, Clock, Shield, Palette,
  Moon, Sun, Monitor, Bot, Lock, Mail, Download, Trash2, AlertTriangle,
  Wallet, Phone, Calendar, Check, Settings as SettingsIcon
} from "lucide-react";
import { getUserData, updateProfile, updateTutorProfile, changePassword, changeEmail, downloadUserData, deleteUserAccount } from "@/app/actions/user";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = ["Morning", "Afternoon", "Evening"];

const ACCENT_COLORS = [
  { name: "Edyfra Blue", value: "#1e3a8a" },
  { name: "Knowledge Teal", value: "#0d9488" },
  { name: "Success Green", value: "#15803d" },
  { name: "Royal Purple", value: "#6d28d9" },
  { name: "Warm Amber", value: "#b45309" },
];

export default function TutorSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: "", bio: "", subjects: "", confidenceLevels: "", levelsTaught: "",
    hourlyRate: "", mpesaNumber: "", sessionPreference: "both", maxGroupStudents: "3",
    defaultSessionDuration: "60", allowSessionRecording: false, showRatingPublicly: true,
    allowReRequest: true, autoAcceptRequests: false, allowMashInactive: true, showMashSummary: true,
    bioCharsLeft: 300,
  });
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [availableNow, setAvailableNow] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", newPass: "", confirm: "" });
  const [newEmail, setNewEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [prefs, setPrefs] = useState<any>({});
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    newRequest: true, studentJoined: true, studentLeft: true,
    newMessage: true, newRating: true, announcements: true, tutorMessages: true,
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const user = await getUserData() as any;
    if (user) {
      setUserData(user);
      const tp = user.tutorProfile || {};
      setFormData({
        name: user.name || "",
        bio: tp.bio || "",
        bioCharsLeft: 300 - (tp.bio?.length || 0),
        subjects: tp.subjects?.join(", ") || "",
        confidenceLevels: "",
        levelsTaught: tp.levelsTaught?.join(", ") || "",
        hourlyRate: tp.hourlyRate?.toString() || "500",
        mpesaNumber: tp.mpesaNumber || "",
        sessionPreference: tp.sessionPreference || "both",
        maxGroupStudents: tp.maxGroupStudents?.toString() || "3",
        defaultSessionDuration: tp.defaultSessionDuration?.toString() || "60",
        allowSessionRecording: tp.allowSessionRecording ?? false,
        showRatingPublicly: tp.showRatingPublicly ?? true,
        allowReRequest: tp.allowReRequest ?? true,
        autoAcceptRequests: tp.autoAcceptRequests ?? false,
        allowMashInactive: tp.allowMashInactive ?? true,
        showMashSummary: tp.showMashSummary ?? true,
      });
      setSchedule(tp.availability?.schedule || {});
      setAvailableNow(tp.availability?.isOnline || false);
      setPrefs(user.userPreferences || {});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTutorProfile({
        name: formData.name,
        bio: formData.bio,
        subjects: formData.subjects.split(",").map((s: string) => s.trim()).filter(Boolean),
        levelsTaught: formData.levelsTaught.split(",").map((s: string) => s.trim()).filter(Boolean),
        hourlyRate: parseInt(formData.hourlyRate) || 500,
        mpesaNumber: formData.mpesaNumber,
        sessionPreference: formData.sessionPreference,
        maxGroupStudents: parseInt(formData.maxGroupStudents) || 3,
        availability: { isOnline: availableNow, schedule },
        autoAcceptRequests: formData.autoAcceptRequests,
        defaultSessionDuration: parseInt(formData.defaultSessionDuration),
        allowSessionRecording: formData.allowSessionRecording,
        showRatingPublicly: formData.showRatingPublicly,
        allowReRequest: formData.allowReRequest,
        allowMashInactive: formData.allowMashInactive,
        showMashSummary: formData.showMashSummary,
      });
      toast.success("Profile updated");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  const toggleSchedule = (day: string, slot: string) => {
    setSchedule(prev => {
      const slots = prev[day] || [];
      if (slots.includes(slot)) return { ...prev, [day]: slots.filter(s => s !== slot) };
      return { ...prev, [day]: [...slots, slot] };
    });
  };

  const handleSavePrefs = async (key: string, value: any) => {
    setPrefs((prev: any) => ({ ...prev, [key]: value }));
    try {
      const { updateUserPreferences } = await import("@/app/actions/user");
      await updateUserPreferences({ [key]: value });
      if (key === "accentColor") window.dispatchEvent(new CustomEvent("accent-color-changed", { detail: value }));
    } catch { toast.error("Failed to save"); }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPass !== passwordData.confirm) { toast.error("Passwords don't match"); return; }
    try { await changePassword(passwordData.current, passwordData.newPass); toast.success("Password changed"); setPasswordData({ current: "", newPass: "", confirm: "" }); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.includes("@")) { toast.error("Invalid email"); return; }
    try { await changeEmail(newEmail); toast.success("Verification email sent"); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const result = await downloadUserData();
      if (result.success) {
        const blob = new Blob([result.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "edyfra-tutor-data.json"; a.click();
        toast.success("Data downloaded");
      }
    } catch { toast.error("Failed to download"); }
    finally { setDownloading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    try { await deleteUserAccount(); toast.success("Account deleted"); window.location.href = "/login"; }
    catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[600px]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const notifItems = [
    { key: "newRequest", label: "New student request" },
    { key: "studentJoined", label: "Student joined my group" },
    { key: "studentLeft", label: "Student left my session" },
    { key: "newMessage", label: "New message from student" },
    { key: "newRating", label: "New rating received" },
    { key: "announcements", label: "Platform announcements" },
    { key: "tutorMessages", label: "Messages from other tutors" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Settings.</h1>
          <p className="text-muted-foreground text-lg font-medium">Manage your profile, availability, and preferences.</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-none px-5 py-2 font-black uppercase tracking-[0.2em] text-[10px] rounded-full">Verified Expert</Badge>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto overflow-x-auto gap-6 mb-8">
          <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><User className="h-4 w-4 mr-2" /> Profile</TabsTrigger>
          <TabsTrigger value="availability" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Calendar className="h-4 w-4 mr-2" /> Availability</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Clock className="h-4 w-4 mr-2" /> Sessions</TabsTrigger>
          <TabsTrigger value="mash" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Bot className="h-4 w-4 mr-2" /> Mash</TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Palette className="h-4 w-4 mr-2" /> Appearance</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-1"><Shield className="h-4 w-4 mr-2" /> Account</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><User className="h-6 w-6 text-primary" /> Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Display Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6 focus-visible:ring-primary" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Bio ({formData.bioCharsLeft} chars left)</Label>
                <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 300), bioCharsLeft: 300 - e.target.value.length })} className="min-h-[120px] rounded-[2rem] border-border bg-secondary/50 font-bold p-6 focus-visible:ring-primary" placeholder="Your teaching philosophy..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Subjects (comma separated)</Label>
                  <Input value={formData.subjects} onChange={(e) => setFormData({ ...formData, subjects: e.target.value })} className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Confidence Levels (subject:level)</Label>
                  <Input value={formData.confidenceLevels} onChange={(e) => setFormData({ ...formData, confidenceLevels: e.target.value })} placeholder="Math:5, Physics:4" className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6" />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Teaching Level</Label>
                <Select value={formData.levelsTaught} onValueChange={(v) => setFormData({ ...formData, levelsTaught: v })}>
                  <SelectTrigger className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                    <SelectItem value="UNIVERSITY">University</SelectItem>
                    <SelectItem value="HIGH_SCHOOL,UNIVERSITY">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Hourly Rate (Ksh)</Label>
                  <Input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">M-Pesa Number</Label>
                  <Input value={formData.mpesaNumber} onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })} placeholder="07XX XXX XXX" className="h-16 rounded-2xl border-border bg-secondary/50 font-bold px-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVAILABILITY */}
        <TabsContent value="availability">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Calendar className="h-6 w-6 text-primary" /> Availability</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div>
                  <Label className="text-base font-bold text-primary">Available Now</Label>
                  <p className="text-sm text-muted-foreground">Immediately visible in student searches</p>
                </div>
                <Switch checked={availableNow} onCheckedChange={setAvailableNow} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-base font-bold">Weekly Schedule</Label>
                <p className="text-sm text-muted-foreground">Toggle availability per day and time slot</p>
              </div>
              <div className="space-y-4">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
                    <span className="w-24 font-bold text-sm">{day}</span>
                    <div className="flex gap-2">
                      {TIME_SLOTS.map(slot => (
                        <button key={slot} onClick={() => toggleSchedule(day, slot)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${(schedule[day] || []).includes(slot) ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{slot}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Session Preference</Label>
                <Select value={formData.sessionPreference} onValueChange={(v) => setFormData({ ...formData, sessionPreference: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-border bg-secondary/50 font-bold px-6"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1on1">1-on-1 only</SelectItem>
                    <SelectItem value="group">Group only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Max Students Per Group</Label>
                <Input type="number" min="2" max="5" value={formData.maxGroupStudents} onChange={(e) => setFormData({ ...formData, maxGroupStudents: e.target.value })} className="h-14 rounded-2xl border-border bg-secondary/50 font-bold px-6 w-32" />
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div>
                  <Label className="text-base font-bold text-primary">Auto-accept Requests</Label>
                  <p className="text-sm text-muted-foreground">Incoming requests are automatically accepted</p>
                </div>
                <Switch checked={formData.autoAcceptRequests} onCheckedChange={(v) => setFormData({ ...formData, autoAcceptRequests: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Bell className="h-6 w-6 text-primary" /> Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-4">
              {notifItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                  <Label className="text-base font-bold text-primary">{item.label}</Label>
                  <Switch checked={notifPrefs[item.key] ?? true} onCheckedChange={(v) => setNotifPrefs({...notifPrefs, [item.key]: v})} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SESSION SETTINGS */}
        <TabsContent value="sessions">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><SettingsIcon className="h-6 w-6 text-primary" /> Session Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Default Session Duration</Label>
                <Select value={formData.defaultSessionDuration} onValueChange={(v) => setFormData({ ...formData, defaultSessionDuration: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-border bg-secondary/50 font-bold px-6"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div><Label className="text-base font-bold text-primary">Allow Session Recording</Label></div>
                <Switch checked={formData.allowSessionRecording} onCheckedChange={(v) => setFormData({ ...formData, allowSessionRecording: v })} />
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div><Label className="text-base font-bold text-primary">Show My Rating Publicly</Label></div>
                <Switch checked={formData.showRatingPublicly} onCheckedChange={(v) => setFormData({ ...formData, showRatingPublicly: v })} />
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div><Label className="text-base font-bold text-primary">Allow Re-requests After Session</Label></div>
                <Switch checked={formData.allowReRequest} onCheckedChange={(v) => setFormData({ ...formData, allowReRequest: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MASH SETTINGS */}
        <TabsContent value="mash">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Bot className="h-6 w-6 text-primary" /> Mash AI for Tutors</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div>
                  <Label className="text-base font-bold text-primary">Mash Steps In When Inactive</Label>
                  <p className="text-sm text-muted-foreground">Mash takes over after 2 minutes of inactivity during a session</p>
                </div>
                <Switch checked={formData.allowMashInactive} onCheckedChange={(v) => setFormData({ ...formData, allowMashInactive: v })} />
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div>
                  <Label className="text-base font-bold text-primary">Show Mash Summary Before Joining</Label>
                  <p className="text-sm text-muted-foreground">See what Mash covered before you join a session</p>
                </div>
                <Switch checked={formData.showMashSummary} onCheckedChange={(v) => setFormData({ ...formData, showMashSummary: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Palette className="h-6 w-6 text-primary" /> Theme</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant={theme === "light" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "light" ? "bg-primary text-white" : ""}`} onClick={() => setTheme("light")}><Sun className="h-6 w-6" /> Light</Button>
                <Button variant={theme === "dark" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "dark" ? "bg-primary text-white" : ""}`} onClick={() => setTheme("dark")}><Moon className="h-6 w-6" /> Dark</Button>
                <Button variant={theme === "system" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "system" ? "bg-primary text-white" : ""}`} onClick={() => setTheme("system")}><Monitor className="h-6 w-6" /> System</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Palette className="h-6 w-6 text-primary" /> Accent Color</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="flex flex-wrap gap-4">
                {ACCENT_COLORS.map((color) => (
                  <button key={color.value} onClick={() => handleSavePrefs("accentColor", color.value)} className={`h-12 w-12 rounded-full border-4 transition-all transform hover:scale-110 flex items-center justify-center shadow-md ${prefs.accentColor === color.value ? "border-primary scale-110" : "border-transparent"}`} style={{ backgroundColor: color.value }}>
                    {prefs.accentColor === color.value && <Check className="h-6 w-6 text-white" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest">Layout & Font</CardTitle>
            </CardHeader>
            <CardContent className="p-10 grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest">Layout</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={prefs.layout === "compact" ? "default" : "outline"} className="rounded-xl" onClick={() => handleSavePrefs("layout", "compact")}>Compact</Button>
                  <Button variant={prefs.layout !== "compact" ? "default" : "outline"} className="rounded-xl" onClick={() => handleSavePrefs("layout", "comfortable")}>Comfortable</Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest">Font Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={prefs.fontSize !== "large" ? "default" : "outline"} className="rounded-xl" onClick={() => handleSavePrefs("fontSize", "normal")}>Normal</Button>
                  <Button variant={prefs.fontSize === "large" ? "default" : "outline"} className="rounded-xl" onClick={() => handleSavePrefs("fontSize", "large")}>Large</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNT */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest flex items-center gap-3"><Lock className="h-6 w-6 text-primary" /> Change Password</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-4">
              <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="h-14 rounded-2xl border-border" /></div>
              <div className="space-y-2"><Label>New Password</Label><Input type="password" value={passwordData.newPass} onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })} className="h-14 rounded-2xl border-border" /></div>
              <div className="space-y-2"><Label>Confirm</Label><Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="h-14 rounded-2xl border-border" /></div>
              <Button onClick={handleChangePassword} className="rounded-2xl bg-primary h-12 px-8"><Lock className="h-4 w-4 mr-2" /> Update</Button>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest"><Mail className="h-6 w-6 text-primary mr-2 inline" /> Change Email</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-4">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" className="h-14 rounded-2xl border-border" />
              <Button onClick={handleChangeEmail} className="rounded-2xl bg-primary h-12 px-8"><Mail className="h-4 w-4 mr-2" /> Send Verification</Button>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50 rounded-[3rem]">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest">Download My Data</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <Button onClick={handleDownloadData} disabled={downloading} variant="outline" className="rounded-2xl h-12 px-8">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />} Export as JSON
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50 rounded-[3rem] border-destructive/20">
            <CardHeader className="p-10 border-b border-border">
              <CardTitle className="text-2xl font-black tracking-tightest text-destructive">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-4">
              <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm">All sessions, ratings, and earnings data will be permanently removed.</p>
              </div>
              <Dialog>
                <DialogTrigger render={<Button variant="destructive" className="rounded-2xl h-12 px-8"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                    <DialogDescription>Type DELETE to confirm</DialogDescription>
                  </DialogHeader>
                  <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="rounded-xl" />
                  <DialogFooter><Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}>Delete Forever</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button (affects profile & availability tabs) */}
      <div className="flex justify-end pt-4 sticky bottom-8">
        <Button onClick={handleSave} disabled={saving} className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95">
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Save className="h-5 w-5 mr-3" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}