"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper, Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function NewsPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Education");
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [summary, setSummary] = useState("");
  const [publish, setPublish] = useState(false);

  const load = async () => {
    const { getNewsArticles } = await import("@/app/actions/admin-content");
    const data = await getNewsArticles();
    setArticles(data);
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
    if (!title || !slug || !body) return;
    const { createNewsArticle } = await import("@/app/actions/admin-content");
    await createNewsArticle({ title, slug, category, body, coverImage, summary, publish });
    toast.success(publish ? "Published!" : "Saved as draft");
    setTitle(""); setSlug(""); setBody(""); setCoverImage(""); setSummary(""); setShowForm(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    const { deleteNewsArticle } = await import("@/app/actions/admin-content");
    await deleteNewsArticle(id);
    toast.success("Deleted");
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const categories = ["Education", "Tech", "Student Life", "Announcements"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Knowledge Feed</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage articles for the /news page</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-2xl"><Plus className="h-4 w-4 mr-2" /> New Article</Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
            <Input placeholder="Slug (url-friendly)" value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-xl" />
            <div className="flex gap-4">
              <Select value={category} onValueChange={(v: string | null) => setCategory(v ?? "Education")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Cover image URL" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="rounded-xl" />
            </div>
            <Input placeholder="Summary (short preview)" value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-xl" />
            <Textarea placeholder="Article body (HTML supported)" value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl min-h-[200px]" />
            <div className="flex gap-4">
              <Button onClick={() => { setPublish(true); handleCreate(); }} className="rounded-xl"><Eye className="h-4 w-4 mr-2" /> Publish Now</Button>
              <Button onClick={() => { setPublish(false); handleCreate(); }} variant="outline" className="rounded-xl"><EyeOff className="h-4 w-4 mr-2" /> Save as Draft</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((a) => (
          <Card key={a.id} className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest font-black">{a.category}</span>
                  {a.isDraft && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 uppercase tracking-widest font-black">Draft</span>}
                </div>
                <Button onClick={() => handleDelete(a.id)} variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <h3 className="font-black text-lg mt-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.summary || a.body?.slice(0, 100)}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
