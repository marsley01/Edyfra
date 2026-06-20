"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User, BookOpen, Loader2, Save, Bell, Clock, Shield, Palette,
  Moon, Sun, Monitor, Bot, Lock, Mail, Download, Trash2, AlertTriangle,
  Wallet, Phone, Calendar, Check, Settings as SettingsIcon, Globe,
  ChevronRight, Sparkles, Star, Video
} from "lucide-react";
import { getUserData, updateProfile, updateTutorProfile, changePassword, changeEmail, downloadUserData, deleteUserAccount, updateAvatar, updateNotificationSettings } from "@/app/actions/user";
import { getNotificationSettings } from "@/app/actions/notifications";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { TUTOR_CONFIG } from "@/lib/config";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarPicker, type AvatarStyle } from "@/components/ui/avatar-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { showError, showSuccess, showUnknownError } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { TutorAvailabilityCalendar } from "@/components/tutor/TutorAvailabilityCalendar";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = ["Morning", "Afternoon", "Evening"];

const ACCENT_COLORS = [
  { name: "Campus Navy", value: "#0F4C5C" },
  { name: "Royal Blue", value: "#1A5276" },
  { name: "Edyfra Blue", value: "#1e3a8a" },
  { name: "Knowledge Teal", value: "#0d9488" },
  { name: "Coral CTA", value: "#E07A5F" },
  { name: "Berry Punch", value: "#D81B60" },
  { name: "Warm Amber", value: "#b45309" },
  { name: "Royal Purple", value: "#6d28d9" },
];

const SIDEBAR_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "availability", label: "Availability", icon: Calendar },
  { id: "sessions", label: "Sessions", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "mash", label: "Mash AI", icon: Bot },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account", icon: Shield },
];

export default function TutorSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
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
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<AvatarStyle | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
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
      setCurrentAvatar(user.avatar || null);
      const tp = user.tutorProfile || {};
      setFormData({
        name: user.name || "",
        bio: tp.bio || "",
        bioCharsLeft: 300 - (tp.bio?.length || 0),
        subjects: tp.subjects?.join(", ") || "",
        confidenceLevels: "",
        levelsTaught: tp.levelsTaught?.join(", ") || "",
        hourlyRate: tp.hourlyRate?.toString() || TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH.toString(),
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
      try {
        const notifSettings = await getNotificationSettings();
        if (Object.keys(notifSettings).length > 0) {
          setNotifPrefs(prev => ({ ...prev, ...notifSettings }));
        }
      } catch {}
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
        hourlyRate: parseInt(formData.hourlyRate) || TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH,
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
      showSuccess("Profile updated", { description: "Your changes are saved." });
    }     catch { showError({ title: "Couldn't save your changes", cause: "We couldn't reach our servers.", fix: "Try again, or refresh the page." }); }
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
    }     catch { showError({ title: "Couldn't save that", cause: "We couldn't reach our servers.", fix: "Try again, or refresh the page." }); }
  };

  const handleSaveNotif = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try { await updateNotificationSettings(updated); }
    catch { showError({ title: "Couldn't save notification preferences", cause: "We couldn't reach our servers.", fix: "Try again, or refresh the page." }); }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPass !== passwordData.confirm) {
      showError({
        title: "Passwords don't match",
        cause: "The new password and confirmation are different.",
        fix: "Re-type both — they have to be identical.",
      });
      return;
    }
    try {
      await changePassword(passwordData.current, passwordData.newPass);
      showSuccess("Password changed", { description: "Use your new password next time you sign in." });
      setPasswordData({ current: "", newPass: "", confirm: "" });
    }
    catch (e: any) { showUnknownError(e, "Couldn't change your password"); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.includes("@")) {
      showError({
        title: "That email doesn't look right",
        cause: "It's missing an @ or a domain.",
        fix: "Use a full email like you@gmail.com.",
      });
      return;
    }
    try {
      await changeEmail(newEmail);
      showSuccess("Verification sent", { description: "Check your new email's inbox to confirm." });
    }
    catch (e: any) { showUnknownError(e, "Couldn't update your email"); }
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const result = await downloadUserData();
      if (result.success) {
        const blob = new Blob([result.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "edyfra-tutor-data.json"; a.click();
        showSuccess("Download ready", { description: "Your data file is on its way to your downloads folder." });
      }
    }     catch { showError({ title: "Download didn't start", cause: "We couldn't reach our servers.", fix: "Try again, or refresh the page." }); }
    finally { setDownloading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      showError({
        title: "Type DELETE to confirm",
        cause: "We need a deliberate yes before we delete everything.",
        fix: "Type the word DELETE in capital letters, then press the button.",
      });
      return;
    }
    try {
      await deleteUserAccount();
      showSuccess("Account deleted", { description: "We're sorry to see you go. Your data is gone." });
      window.location.href = "/login";
    }
    catch { showError({ title: "Couldn't delete your account", cause: "We couldn't reach our servers.", fix: "Try again, or contact support if it keeps happening." }); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const notifItems = [
    { key: "newRequest", label: "New student request" },
    { key: "studentJoined", label: "Student joined my group" },
    { key: "studentLeft", label: "Student left my session" },
    { key: "newMessage", label: "New message from student" },
    { key: "newRating", label: "New rating received" },
    { key: "announcements", label: "Platform announcements" },
    { key: "tutorMessages", label: "Messages from other tutors" },
  ];

  const profileCompletion = (() => {
    let score = 0;
    if (formData.name) score += 20;
    if (formData.bio) score += 20;
    if (formData.subjects) score += 20;
    if (formData.levelsTaught) score += 20;
    if (formData.hourlyRate && formData.mpesaNumber) score += 20;
    return score;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/10 to-primary/5 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full translate-y-1/3 translate-x-1/3 pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 text-sm text-primary mb-3 uppercase tracking-widest font-black">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Settings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest">Settings</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Customize your profile, preferences, and account</p>
        </div>

        {/* Profile Summary Card */}
        <Card className="mb-10 border-border/30 bg-background/40 backdrop-blur-2xl shadow-2xl shadow-primary/5 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5 opacity-50" />
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 blur-[80px] group-hover:bg-primary/20 transition-all duration-700 pointer-events-none" />
          <CardContent className="relative p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative group">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarImage src={currentAvatar || undefined} alt={formData.name} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-white">
                    {formData.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => setAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-2xl font-bold truncate">{formData.name || "Your Name"}</h2>
                  <Badge className="bg-primary/10 text-primary border-none font-semibold text-xs w-fit">Tutor</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {userData?.tutorProfile?.rating || "New"}</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {formData.subjects || "No subjects set"}</span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <div className="text-2xl font-bold text-primary">{profileCompletion}%</div>
                <div className="text-xs text-muted-foreground font-medium">Profile complete</div>
                <div className="w-32 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop: Sidebar + Content */}
        <div className="flex gap-8">
          {/* Sidebar Nav */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-2">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 overflow-hidden group text-left ${
                      isActive
                        ? "text-primary shadow-xl shadow-primary/10 bg-background border border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 bg-primary/5 rounded-2xl transition-transform duration-300" />
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    )}
                    <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Tab Bar */}
            <div className="flex lg:hidden overflow-x-auto gap-1 mb-6 pb-2 scrollbar-thin -mx-4 px-4">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeTab === item.id
                        ? "bg-primary text-white shadow-sm"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* PROFILE */}
            {activeTab === "profile" && (
              <Card className="border-border/30 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5 overflow-hidden rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Profile</CardTitle>
                      <CardDescription>Your public tutor information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/10 shadow-md">
                      <AvatarImage src={currentAvatar || undefined} alt={formData.name} className="object-cover" />
                      <AvatarFallback className="text-lg sm:text-xl bg-gradient-to-br from-primary to-primary/60 text-white">{formData.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                      <DialogTrigger>
                        <Button variant="outline" className="rounded-xl border-border/50 text-sm">
                          <Sparkles className="h-4 w-4 mr-2 text-primary" />
                          Change Avatar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                          <DialogTitle>Choose an avatar</DialogTitle>
                          <DialogDescription>Pick a style that represents you.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <AvatarPicker
                            selected={selectedAvatarStyle}
                            onSelect={setSelectedAvatarStyle}
                            seed={formData.name || "user"}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setAvatarDialogOpen(false)}>Cancel</Button>
                          <Button disabled={!selectedAvatarStyle || savingAvatar} onClick={async () => {
                              if (!selectedAvatarStyle) return;
                              setSavingAvatar(true);
                              try {
                                const url = `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(formData.name || "user")}`;
                                await updateAvatar(url);
                                setCurrentAvatar(url);
                                showSuccess("Avatar updated", { description: "Your new look is live." });
                                setAvatarDialogOpen(false);
                              } catch { showError({ title: "Couldn't update your avatar", cause: "We couldn't reach our servers.", fix: "Try a different image, or try again in a moment." }); }
                              finally { setSavingAvatar(false); }
                            }} className="rounded-xl"
                          >{savingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Avatar"}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Display Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Bio <span className="font-normal text-muted-foreground/60">({formData.bioCharsLeft} chars left)</span></Label>
                    <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 300), bioCharsLeft: 300 - e.target.value.length })} className="min-h-[100px] rounded-xl border-border/50 bg-secondary/30" placeholder="Your teaching philosophy..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Subjects</Label>
                      <Input value={formData.subjects} onChange={(e) => setFormData({ ...formData, subjects: e.target.value })} placeholder="Math, Physics, Chemistry" className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Confidence Levels</Label>
                      <Input value={formData.confidenceLevels} onChange={(e) => setFormData({ ...formData, confidenceLevels: e.target.value })} placeholder="Math:5, Physics:4" className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Teaching Level</Label>
                    <Select value={formData.levelsTaught} onValueChange={(v) => setFormData({ ...formData, levelsTaught: v })}>
                      <SelectTrigger className="h-11 rounded-xl border-border/50 bg-secondary/30"><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                        <SelectItem value="UNIVERSITY">University</SelectItem>
                        <SelectItem value="HIGH_SCHOOL,UNIVERSITY">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Hourly Rate (Ksh)</Label>
                      <Input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">M-Pesa Number</Label>
                      <Input value={formData.mpesaNumber} onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })} placeholder="07XX XXX XXX" className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AVAILABILITY */}
            {activeTab === "availability" && (
              <Card className="border-border/30 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5 overflow-hidden rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Availability</CardTitle>
                      <CardDescription>Manage when you&apos;re available for sessions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/[0.02] border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="font-semibold text-primary">Available Now</Label>
                      <p className="text-sm text-muted-foreground">Instantly visible in student searches</p>
                    </div>
                    <Switch checked={availableNow} onCheckedChange={setAvailableNow} />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <TutorAvailabilityCalendar tutorId={userData?.id} />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Session Preference</Label>
                      <Select value={formData.sessionPreference} onValueChange={(v) => setFormData({ ...formData, sessionPreference: v })}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1on1">1-on-1 only</SelectItem>
                          <SelectItem value="group">Group only</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Max Students Per Group</Label>
                      <Input type="number" min="2" max="5" value={formData.maxGroupStudents} onChange={(e) => setFormData({ ...formData, maxGroupStudents: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30 max-w-[140px]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/[0.02] border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="font-semibold text-primary">Auto-accept Requests</Label>
                      <p className="text-sm text-muted-foreground">Incoming requests are automatically accepted</p>
                    </div>
                    <Switch checked={formData.autoAcceptRequests} onCheckedChange={(v) => setFormData({ ...formData, autoAcceptRequests: v })} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <Card className="border-border/30 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5 overflow-hidden rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Notifications</CardTitle>
                      <CardDescription>Control what alerts you receive</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-3">
                  {notifItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/30">
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <Switch checked={notifPrefs[item.key] ?? true} onCheckedChange={(v) => handleSaveNotif(item.key, v)} />
                    </div>
                  ))}
                  <Separator className="my-4" />
                  <PushNotificationManager />
                </CardContent>
              </Card>
            )}

            {/* SESSIONS */}
            {activeTab === "sessions" && (
              <Card className="border-border/30 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5 overflow-hidden rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Session Settings</CardTitle>
                      <CardDescription>Configure how your sessions work</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Default Session Duration</Label>
                    <Select value={formData.defaultSessionDuration} onValueChange={(v) => setFormData({ ...formData, defaultSessionDuration: v })}>
                      <SelectTrigger className="h-11 rounded-xl border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
                    <Label className="text-sm font-medium">Allow Session Recording</Label>
                    <Switch checked={formData.allowSessionRecording} onCheckedChange={(v) => setFormData({ ...formData, allowSessionRecording: v })} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
                    <Label className="text-sm font-medium">Show My Rating Publicly</Label>
                    <Switch checked={formData.showRatingPublicly} onCheckedChange={(v) => setFormData({ ...formData, showRatingPublicly: v })} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
                    <Label className="text-sm font-medium">Allow Re-requests After Session</Label>
                    <Switch checked={formData.allowReRequest} onCheckedChange={(v) => setFormData({ ...formData, allowReRequest: v })} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MASH */}
            {activeTab === "mash" && (
              <Card className="border-border/30 bg-background/60 backdrop-blur-xl shadow-xl shadow-primary/5 overflow-hidden rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Mash AI</CardTitle>
                      <CardDescription>Configure your AI teaching assistant</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30 gap-4">
                    <div className="min-w-0">
                      <Label className="text-sm font-medium">Mash Steps In When Inactive</Label>
                      <p className="text-sm text-muted-foreground">Mash takes over after 2 minutes of inactivity</p>
                    </div>
                    <Switch checked={formData.allowMashInactive} onCheckedChange={(v) => setFormData({ ...formData, allowMashInactive: v })} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30 gap-4">
                    <div className="min-w-0">
                      <Label className="text-sm font-medium">Show Mash Summary Before Joining</Label>
                      <p className="text-sm text-muted-foreground">See what Mash covered before you join</p>
                    </div>
                    <Switch checked={formData.showMashSummary} onCheckedChange={(v) => setFormData({ ...formData, showMashSummary: v })} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* APPEARANCE */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Theme</CardTitle>
                        <CardDescription>Choose your preferred look</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <div className="grid grid-cols-3 gap-3">
                      <Button variant={theme === "light" ? "default" : "outline"} className={`flex-col h-24 gap-2 rounded-xl ${theme === "light" ? "bg-primary text-white shadow-md" : "border-border/50"}`} onClick={() => setTheme("light")}><Sun className="h-5 w-5" /> Light</Button>
                      <Button variant={theme === "dark" ? "default" : "outline"} className={`flex-col h-24 gap-2 rounded-xl ${theme === "dark" ? "bg-primary text-white shadow-md" : "border-border/50"}`} onClick={() => setTheme("dark")}><Moon className="h-5 w-5" /> Dark</Button>
                      <Button variant={theme === "system" ? "default" : "outline"} className={`flex-col h-24 gap-2 rounded-xl ${theme === "system" ? "bg-primary text-white shadow-md" : "border-border/50"}`} onClick={() => setTheme("system")}><Monitor className="h-5 w-5" /> System</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Accent Color</CardTitle>
                        <CardDescription>Personalize your interface</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-wrap gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button key={color.value} onClick={() => handleSavePrefs("accentColor", color.value)} className={`h-10 w-10 rounded-full border-4 transition-all hover:scale-110 flex items-center justify-center shadow-sm ${prefs.accentColor === color.value ? "border-primary scale-110" : "border-transparent"}`} style={{ backgroundColor: color.value }}>
                          {prefs.accentColor === color.value && <Check className="h-5 w-5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Language</CardTitle>
                        <CardDescription>Choose your interface language</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Preferred Language</Label>
                      <Select value={prefs.preferredLanguage || "english"} onValueChange={(v) => handleSavePrefs("preferredLanguage", v)}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="swahili">Kiswahili</SelectItem>
                          <SelectItem value="french">Français</SelectItem>
                          <SelectItem value="spanish">Español</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">The dashboard greeting and interface will adapt.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <SettingsIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Layout & Font</CardTitle>
                        <CardDescription>Adjust spacing and text size</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Layout</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant={prefs.layout === "compact" ? "default" : "outline"} className="rounded-lg text-sm h-10" onClick={() => handleSavePrefs("layout", "compact")}>Compact</Button>
                          <Button variant={prefs.layout !== "compact" ? "default" : "outline"} className="rounded-lg text-sm h-10" onClick={() => handleSavePrefs("layout", "comfortable")}>Comfortable</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Font Size</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant={prefs.fontSize !== "large" ? "default" : "outline"} className="rounded-lg text-sm h-10" onClick={() => handleSavePrefs("fontSize", "normal")}>Normal</Button>
                          <Button variant={prefs.fontSize === "large" ? "default" : "outline"} className="rounded-lg text-sm h-10" onClick={() => handleSavePrefs("fontSize", "large")}>Large</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ACCOUNT */}
            {activeTab === "account" && (
              <div className="space-y-5">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Change Password</CardTitle>
                        <CardDescription>Update your account password</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 space-y-4">
                    <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground">Current Password</Label><Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground">New Password</Label><Input type="password" value={passwordData.newPass} onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground">Confirm</Label><Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="h-11 rounded-xl border-border/50 bg-secondary/30" /></div>
                    <Button onClick={handleChangePassword} className="rounded-xl h-11 px-6"><Lock className="h-4 w-4 mr-2" /> Update Password</Button>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Change Email</CardTitle>
                        <CardDescription>Update your email address</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 space-y-4">
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" className="h-11 rounded-xl border-border/50 bg-secondary/30" />
                    <Button onClick={handleChangeEmail} className="rounded-xl h-11 px-6"><Mail className="h-4 w-4 mr-2" /> Send Verification</Button>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Download className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Download My Data</CardTitle>
                        <CardDescription>Export your account data as JSON</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8">
                    <Button onClick={handleDownloadData} disabled={downloading} variant="outline" className="rounded-xl h-11 px-6 border-border/50">
                      {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />} Export as JSON
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm border-destructive/20">
                  <CardHeader className="p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-destructive/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-destructive/10">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-destructive">Delete Account</CardTitle>
                        <CardDescription>Permanently remove your account and data</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 space-y-4">
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">All sessions, ratings, and earnings data will be permanently removed. This action cannot be undone.</p>
                    </div>
                    <Dialog>
                      <DialogTrigger>
                        <Button variant="destructive" className="rounded-xl h-11 px-6"><Trash2 className="h-4 w-4 mr-2" /> Delete Account</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                          <DialogDescription>Type DELETE to confirm permanent removal</DialogDescription>
                        </DialogHeader>
                        <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="rounded-xl" />
                        <DialogFooter><Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}>Delete Forever</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="flex justify-end mt-8 sticky bottom-6">
          <Button onClick={handleSave} disabled={saving} className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
