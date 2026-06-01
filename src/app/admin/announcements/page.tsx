"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { getAnnouncements } = await import("@/app/actions/admin-content");
    const data = await getAnnouncements();
    setAnnouncements(data);
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

  const handleCreate = async () => {
    if (!title || !body) return;
    const { createAnnouncement } = await import("@/app/actions/admin-content");
    await createAnnouncement({ title, body, targetAudience: target });
    toast.success("Announcement published");
    setTitle(""); setBody(""); setShowForm(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    const { deleteAnnouncement } = await import("@/app/actions/admin-content");
    await deleteAnnouncement(id);
    toast.success("Deleted");
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Announcements</h1>
          <p className="text-muted-foreground font-medium mt-1">Send banners to your users</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-2xl"><Plus className="h-4 w-4 mr-2" /> New</Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
            <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl min-h-[100px]" />
            <Select value={target} onValueChange={(v: string | null) => setTarget(v ?? "all")}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="students">Students Only</SelectItem>
                <SelectItem value="tutors">Tutors Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} className="rounded-xl">Publish</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="rounded-2xl border-border/50">
            <CardContent className="p-6 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-bold">{a.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary uppercase tracking-widest font-black">{a.targetAudience}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.body}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
              <Button onClick={() => handleDelete(a.id)} variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
