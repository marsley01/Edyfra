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
import { 
  Settings, User, Bell, Palette, Shield, CreditCard, 
  Moon, Sun, Monitor, Check, Loader2, Palette as PaletteIcon 
} from "lucide-react";
import { useTheme } from "next-themes";
import { getUserData, updateProfile, updateUserSettings } from "@/app/actions/user";
import { toast } from "sonner";

const ACCENT_COLORS = [
  { name: "Edyfra Blue", value: "#1e3a8a" },
  { name: "Knowledge Teal", value: "#0d9488" },
  { name: "Success Green", value: "#15803d" },
  { name: "Royal Purple", value: "#6d28d9" },
  { name: "Warm Amber", value: "#b45309" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data: any = await getUserData();
    if (data) {
      setUserData(data);
      setFormData({
        name: data.name || "",
        bio: data.bio || "",
      });
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    const updatedSettings = { ...userData?.settings, ...newSettings };
    
    // Dispatch instant update event
    if (newSettings.accentColor) {
      window.dispatchEvent(new CustomEvent("accent-color-changed", { detail: newSettings.accentColor }));
    }

    try {
      await updateUserSettings(updatedSettings);
      setUserData({ ...userData, settings: updatedSettings });
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tight text-primary">Academic Settings</h1>
        <p className="text-muted-foreground text-lg">Personalize your learning environment and account security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Tabs defaultValue="profile" className="lg:col-span-4 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <TabsList className="flex flex-col h-auto bg-transparent border-0 space-y-2">
              <TabsTrigger value="profile" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20">
                <User className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="appearance" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20">
                <PaletteIcon className="h-4 w-4" /> Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20">
                <Bell className="h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start gap-3 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl border border-transparent hover:border-primary/20">
                <Shield className="h-4 w-4" /> Security
              </TabsTrigger>
            </TabsList>
          </aside>

          <main className="lg:col-span-3 space-y-8">
            <Card className="border-2 border-primary/5 shadow-sm overflow-hidden rounded-2xl">
              <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Educational Level</h2>
                  <p className="text-sm text-muted-foreground">Your content is locked to this level for academic integrity.</p>
                </div>
                <Badge variant="outline" className="bg-white border-primary/20 text-primary px-4 py-1.5 text-sm font-bold">
                  {userData?.educationLevel?.replace("_", " ")}
                </Badge>
              </div>
            </Card>

            <TabsContent value="profile" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Public Identity</CardTitle>
                  <CardDescription>Update your scholarly profile and biography.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary/10 shadow-lg">
                      <AvatarFallback className="text-2xl bg-primary text-white">
                        {formData.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" className="rounded-xl border-primary/20">Change Avatar</Button>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Full Academic Name</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-xl focus:ring-primary border-primary/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Biography</Label>
                      <Textarea 
                        value={formData.bio} 
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Introduce yourself to the Edyfra community..."
                        className="min-h-[150px] rounded-xl focus:ring-primary border-primary/10"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-primary/[0.02] border-t border-primary/5 p-4 flex justify-end">
                  <Button onClick={handleUpdateProfile} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 px-8">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Profile"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-6">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Environment Theme</CardTitle>
                  <CardDescription>Choose the best lighting for your study sessions.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"}
                    className={`flex-col h-28 gap-2 rounded-2xl ${theme === "light" ? "bg-primary text-white" : "border-primary/10"}`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-6 w-6" /> Light Mode
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "default" : "outline"}
                    className={`flex-col h-28 gap-2 rounded-2xl ${theme === "dark" ? "bg-primary text-white" : "border-primary/10"}`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-6 w-6" /> Dark Mode
                  </Button>
                  <Button 
                    variant={theme === "system" ? "default" : "outline"}
                    className={`flex-col h-28 gap-2 rounded-2xl ${theme === "system" ? "bg-primary text-white" : "border-primary/10"}`}
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-6 w-6" /> System
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Accent Color</CardTitle>
                  <CardDescription>Personalize the primary highlight color of the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleUpdateSettings({ accentColor: color.value })}
                        className={`h-12 w-12 rounded-full border-4 transition-all transform hover:scale-110 flex items-center justify-center shadow-md ${
                          userData?.settings?.accentColor === color.value ? "border-primary scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {userData?.settings?.accentColor === color.value && <Check className="h-6 w-6 text-white" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle>Scholarly Alerts</CardTitle>
                  <CardDescription>Manage how we notify you about matches and rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Session Matching</Label>
                      <p className="text-sm text-muted-foreground">Get notified when a tutor or peer accepts your request.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-base font-bold text-primary">Daily Challenge</Label>
                      <p className="text-sm text-muted-foreground">Reminders to keep your learning streak alive.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
               <Card className="border-2 border-primary/5 shadow-sm rounded-2xl">
                 <CardHeader>
                   <CardTitle>Account Security</CardTitle>
                   <CardDescription>Update your password and security settings.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                       <Label>Current Password</Label>
                       <Input type="password" placeholder="••••••••" className="rounded-xl border-primary/10" />
                    </div>
                    <div className="space-y-2">
                       <Label>New Password</Label>
                       <Input type="password" placeholder="••••••••" className="rounded-xl border-primary/10" />
                    </div>
                 </CardContent>
                 <CardFooter className="bg-primary/[0.02] border-t border-primary/5 p-4 flex justify-end">
                    <Button className="rounded-xl bg-primary px-8">Update Password</Button>
                 </CardFooter>
               </Card>
            </TabsContent>
          </main>
        </Tabs>
      </div>
    </div>
  );
}
