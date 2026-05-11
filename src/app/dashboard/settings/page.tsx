"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Settings, User, Bell, Palette, Shield, CreditCard,
  Moon, Sun, Monitor, Check, Loader2, Palette as PaletteIcon,
  BookOpen, Clock, MessageSquare, Trash2, Download, Lock, Mail,
  Eye, EyeOff, Languages, Bot, Search, AlertTriangle, Smartphone
} from "lucide-react";
import { useTheme } from "next-themes";
import { getUserData, updateProfile, updateUserSettings, updateUserPreferences, updateNotificationSettings, updateStudentProfile, changePassword, changeEmail, downloadUserData, deleteUserAccount, updateAvatar } from "@/app/actions/user";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { UpgradeModal } from "@/components/shared/upgrade-modal";
import { AvatarPicker, type AvatarStyle } from "@/components/ui/avatar-picker";

const ACCENT_COLORS = [
  { name: "Edyfra Blue", value: "#1e3a8a" },
  { name: "Knowledge Teal", value: "#0d9488" },
  { name: "Success Green", value: "#15803d" },
  { name: "Royal Purple", value: "#6d28d9" },
  { name: "Warm Amber", value: "#b45309" },
];

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Kiswahili", "Geography", "History", "Computer Science", "Business"];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>({});
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({ name: "", bio: "", educationLevel: "", subjects: "", studyHours: "" });
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({ current: "", newPass: "", confirm: "" });
  const [newEmail, setNewEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<AvatarStyle | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    const data = await getUserData() as any;
    if (data) {
      setUserData(data);
      setCurrentAvatar(data.avatar || null);
      const settings = (data.settings as any) || {};
      setFormData({
        name: data.name || "",
        bio: data.bio || "",
        educationLevel: data.educationLevel || "HIGH_SCHOOL",
        subjects: data.studentProfile?.subjects?.join(", ") || "",
        studyHours: settings.studyHoursPerWeek?.toString() || "",
      });
    }
    try {
      const { getUserPreferences } = await import("@/app/actions/admin-content");
      const prefsData = await getUserPreferences();
      setPrefs(prefsData || {});
      const { getNotificationSettings } = await import("@/app/actions/admin-content");
      const ns = await getNotificationSettings();
      setNotifPrefs((ns?.preferences as Record<string, boolean>) || {});
    } catch {}
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateStudentProfile({
        name: formData.name,
        bio: formData.bio,
        educationLevel: formData.educationLevel,
        subjects: formData.subjects.split(",").map(s => s.trim()).filter(Boolean),
        studyHoursPerWeek: parseInt(formData.studyHours) || 0,
      });
      toast.success("Profile updated");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleSavePrefs = async (key: string, value: any) => {
    // Plan gating for accent colors
    if (key === "accentColor" && userData?.plan !== "plus") {
      setLockedFeature("Custom Accent Colors");
      setShowUpgradeModal(true);
      return;
    }

    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await updateUserPreferences({ [key]: value });
      if (key === "accentColor") {
        window.dispatchEvent(new CustomEvent("accent-color-changed", { detail: value }));
      }
    } catch { toast.error("Failed to save"); }
  };

  const handleSaveNotif = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try { await updateNotificationSettings(updated); }
    catch { toast.error("Failed to save"); }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPass !== passwordData.confirm) { toast.error("Passwords don't match"); return; }
    if (passwordData.newPass.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try {
      await changePassword(passwordData.current, passwordData.newPass);
      toast.success("Password changed");
      setPasswordData({ current: "", newPass: "", confirm: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.includes("@")) { toast.error("Invalid email"); return; }
    try {
      await changeEmail(newEmail);
      toast.success("Verification email sent to " + newEmail);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const result = await downloadUserData();
      if (result.success) {
        const blob = new Blob([result.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "edyfra-data.json"; a.click();
        toast.success("Data downloaded");
      }
    } catch { toast.error("Failed to download"); }
    finally { setDownloading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    try {
      await deleteUserAccount();
      toast.success("Account deleted");
      window.location.href = "/login";
    } catch { toast.error("Failed to delete account"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const notifItems = [
    { key: "newMatch", label: "New match found", desc: "When a study partner is found for you" },
    { key: "tutorAccepted", label: "Tutor accepted my request", desc: "When a tutor approves your session request" },
    { key: "dailyChallenge", label: "Daily challenge available", desc: "When a new daily challenge is posted" },
    { key: "newMessage", label: "New message", desc: "From tutor or study partner" },
    { key: "pointsMilestone", label: "Points milestone reached", desc: "When you hit a new points goal" },
    { key: "announcements", label: "Platform announcements", desc: "Important updates from Edyfra" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground text-lg">Customize how Edyfra looks and works for you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Tabs defaultValue="profile" className="lg:col-span-4 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <TabsList className="flex flex-col h-auto bg-transparent border-0 space-y-2">
              <TabsTrigger value="profile" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><User className="h-4 w-4" /> Profile</TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
              <TabsTrigger value="mash" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><Bot className="h-4 w-4" /> Mash Preferences</TabsTrigger>
              <TabsTrigger value="study" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><BookOpen className="h-4 w-4" /> Study</TabsTrigger>
              <TabsTrigger value="appearance" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><PaletteIcon className="h-4 w-4" /> Appearance</TabsTrigger>
              <TabsTrigger value="privacy" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><Shield className="h-4 w-4" /> Privacy & Safety</TabsTrigger>
              <TabsTrigger value="account" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20"><Lock className="h-4 w-4" /> Account</TabsTrigger>
            </TabsList>
          </aside>

          <main className="lg:col-span-3 space-y-8">
            {/* ======== PROFILE ======== */}
            <TabsContent value="profile" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary/10 shadow-lg">
                      <AvatarImage src={currentAvatar || undefined} alt={formData.name} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-primary text-white">{formData.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                      <DialogTrigger render={<Button variant="outline" className="rounded-xl border-primary/20">Change Avatar</Button>} />
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
                          <Button
                            disabled={!selectedAvatarStyle || savingAvatar}
                            onClick={async () => {
                              if (!selectedAvatarStyle) return;
                              setSavingAvatar(true);
                              try {
                                const url = `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(formData.name || "user")}`;
                                await updateAvatar(url);
                                setCurrentAvatar(url);
                                toast.success("Avatar updated");
                                setAvatarDialogOpen(false);
                              } catch {
                                toast.error("Failed to update avatar");
                              } finally {
                                setSavingAvatar(false);
                              }
                            }}
                            className="rounded-xl bg-primary"
                          >
                            {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Avatar"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-xl border-primary/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Biography</Label>
                      <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Introduce yourself..." className="min-h-[100px] rounded-xl border-primary/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Education Level</Label>
                        <Select value={formData.educationLevel} onValueChange={(v: string | null) => setFormData({ ...formData, educationLevel: v ?? "HIGH_SCHOOL" })}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                            <SelectItem value="UNIVERSITY">University</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Study Hours/Week</Label>
                        <Input type="number" value={formData.studyHours} onChange={(e) => setFormData({ ...formData, studyHours: e.target.value })} className="rounded-xl border-primary/10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subjects of Interest</Label>
                      <Input value={formData.subjects} onChange={(e) => setFormData({ ...formData, subjects: e.target.value })} placeholder="e.g., Mathematics, Physics, Chemistry" className="rounded-xl border-primary/10" />
                      <p className="text-xs text-muted-foreground">Comma separated</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-primary/[0.02] border-t border-primary/5 p-4 flex justify-end">
                  <Button onClick={handleUpdateProfile} disabled={saving} className="rounded-xl bg-primary px-8">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Profile"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ======== NOTIFICATIONS ======== */}
            <TabsContent value="notifications" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notifItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                      <div className="space-y-1">
                        <Label className="text-base font-bold text-primary">{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch checked={notifPrefs[item.key] ?? true} onCheckedChange={(v) => handleSaveNotif(item.key, v)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======== MASH PREFERENCES ======== */}
            <TabsContent value="mash" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Mash AI Preferences</CardTitle>
                  <CardDescription>Customize how Mash interacts with you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Mash as Fallback</Label>
                      <p className="text-sm text-muted-foreground">Enable Mash AI when no study partner is found</p>
                    </div>
                    <Switch checked={prefs.enableMashFallback ?? true} onCheckedChange={(v) => handleSavePrefs("enableMashFallback", v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mash Response Style</Label>
                    <Select value={prefs.mashStyle || "detailed"} onValueChange={(v) => handleSavePrefs("mashStyle", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detailed">Detailed Explanations</SelectItem>
                        <SelectItem value="short">Short and Direct</SelectItem>
                        <SelectItem value="socratic">Socratic (asks me questions)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Language</Label>
                    <Select value={prefs.preferredLanguage || "english"} onValueChange={(v) => handleSavePrefs("preferredLanguage", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="kiswahili">Kiswahili</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======== STUDY PREFERENCES ======== */}
            <TabsContent value="study" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Study Preferences</CardTitle>
                  <CardDescription>Help us find your perfect study match</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Preferred Study Time</Label>
                    <Select value={prefs.studyTime || "any"} onValueChange={(v) => handleSavePrefs("studyTime", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="any">No Preference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Session Length</Label>
                    <Select value={prefs.sessionLength || "any"} onValueChange={(v) => handleSavePrefs("sessionLength", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="any">No Preference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Session Type Preference</Label>
                    <Select value={prefs.sessionTypePref || "any"} onValueChange={(v) => handleSavePrefs("sessionTypePref", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peer">Peer only</SelectItem>
                        <SelectItem value="tutor">Tutor only</SelectItem>
                        <SelectItem value="any">Either</SelectItem>
                        <SelectItem value="ai">AI only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======== APPEARANCE ======== */}
            <TabsContent value="appearance" className="mt-0 space-y-6">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Pick your preferred look</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button variant={theme === "light" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "light" ? "bg-primary text-white" : "border-primary/10"}`} onClick={() => setTheme("light")}><Sun className="h-6 w-6" /> Light</Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "dark" ? "bg-primary text-white" : "border-primary/10"}`} onClick={() => setTheme("dark")}><Moon className="h-6 w-6" /> Dark</Button>
                  <Button variant={theme === "system" ? "default" : "outline"} className={`flex-col h-28 gap-2 rounded-2xl ${theme === "system" ? "bg-primary text-white" : "border-primary/10"}`} onClick={() => setTheme("system")}><Monitor className="h-6 w-6" /> System</Button>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Accent Color</CardTitle>
                  <CardDescription>Pick a color that feels right</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {ACCENT_COLORS.map((color) => {
                      const isLocked = userData?.plan !== "plus";
                      return (
                        <button 
                          key={color.value} 
                          onClick={() => handleSavePrefs("accentColor", color.value)} 
                          className={`h-12 w-12 rounded-full border-4 transition-all transform hover:scale-110 flex items-center justify-center shadow-md relative ${prefs.accentColor === color.value ? "border-primary scale-110" : "border-transparent"}`} 
                          style={{ backgroundColor: color.value }}
                        >
                          {prefs.accentColor === color.value && <Check className="h-6 w-6 text-white" />}
                          {isLocked && (
                            <div className="absolute -top-1 -right-1 bg-background rounded-full p-1 border border-border">
                              <Lock className="h-2 w-2 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Dashboard Layout</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant={prefs.layout === "compact" ? "default" : "outline"} className={`rounded-xl ${prefs.layout === "compact" ? "bg-primary text-white" : ""}`} onClick={() => handleSavePrefs("layout", "compact")}>Compact</Button>
                  <Button variant={prefs.layout !== "compact" ? "default" : "outline"} className={`rounded-xl ${prefs.layout !== "compact" ? "bg-primary text-white" : ""}`} onClick={() => handleSavePrefs("layout", "comfortable")}>Comfortable</Button>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Font Size</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant={prefs.fontSize !== "large" ? "default" : "outline"} className={`rounded-xl ${prefs.fontSize !== "large" ? "bg-primary text-white" : ""}`} onClick={() => handleSavePrefs("fontSize", "normal")}>Normal</Button>
                  <Button variant={prefs.fontSize === "large" ? "default" : "outline"} className={`rounded-xl ${prefs.fontSize === "large" ? "bg-primary text-white" : ""}`} onClick={() => handleSavePrefs("fontSize", "large")}>Large</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======== PRIVACY & SAFETY ======== */}
            <TabsContent value="privacy" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Privacy & Safety</CardTitle>
                  <CardDescription>Control your visibility and safety settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Show my profile to other students</Label>
                      <p className="text-sm text-muted-foreground">Your profile will appear in search results</p>
                    </div>
                    <Switch checked={prefs.showProfile !== false} onCheckedChange={(v) => handleSavePrefs("showProfile", v)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Show my online status</Label>
                      <p className="text-sm text-muted-foreground">Let others see when you are active</p>
                    </div>
                    <Switch checked={prefs.showOnlineStatus !== false} onCheckedChange={(v) => handleSavePrefs("showOnlineStatus", v)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Allow tutor session requests</Label>
                      <p className="text-sm text-muted-foreground">Tutors can send you session invitations</p>
                    </div>
                    <Switch checked={prefs.allowTutorRequests !== false} onCheckedChange={(v) => handleSavePrefs("allowTutorRequests", v)} />
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <Label className="text-base font-bold text-primary">Blocked Users</Label>
                    <p className="text-sm text-muted-foreground">No users blocked yet</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======== ACCOUNT ======== */}
            <TabsContent value="account" className="mt-0 space-y-6">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="rounded-xl border-primary/10" />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={passwordData.newPass} onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })} className="rounded-xl border-primary/10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="rounded-xl border-primary/10" />
                  </div>
                  <Button onClick={handleChangePassword} className="rounded-xl bg-primary"><Lock className="h-4 w-4 mr-2" /> Update Password</Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Change Email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Email Address</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="rounded-xl border-primary/10" />
                  </div>
                  <Button onClick={handleChangeEmail} className="rounded-xl bg-primary"><Mail className="h-4 w-4 mr-2" /> Send Verification</Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Download My Data</CardTitle>
                  <CardDescription>Export your sessions, messages, and points history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleDownloadData} disabled={downloading} variant="outline" className="rounded-xl">
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Export as JSON
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-destructive/20 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Account</CardTitle>
                  <CardDescription>This action is permanent and cannot be undone</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-destructive">Warning</p>
                      <p className="text-sm text-muted-foreground">All your data will be permanently removed including sessions, messages, and achievements.</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger render={<Button variant="destructive" className="rounded-xl"><Trash2 className="h-4 w-4 mr-2" /> Delete My Account</Button>} />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                        <DialogDescription>Type DELETE to confirm permanent account deletion</DialogDescription>
                      </DialogHeader>
                      <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" className="rounded-xl" />
                      <DialogFooter>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}>Delete Forever</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
          </main>
        </Tabs>
      </div>
    </div>
  );
}