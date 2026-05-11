"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap, Upload, FileText, Loader2, CheckCircle, XCircle, ExternalLink, Trash2, BookMarked } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type ContentTab = "upload" | "library";
type ContentType = "Curriculum Book" | "Past Paper" | "Revision Guide" | "Reference Book";

const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Physics", "Chemistry",
  "Biology", "History", "Geography", "CRE", "IRE", "Business Studies",
  "Computer Studies", "Agriculture",
];

const LEVELS = ["Primary", "High School", "University"];
const CURRICULUM_TYPES = ["8-4-4", "CBC", "HEC"];
const CONTENT_TYPES: ContentType[] = ["Curriculum Book", "Past Paper", "Revision Guide", "Reference Book"];

export default function AdminCurriculumPage() {
  const [tab, setTab] = useState<ContentTab>("upload");
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [contentType, setContentType] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f && f.size <= 50 * 1024 * 1024) {
      setFile(f);
    } else {
      toast.error("File must be under 50 MB");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const loadResources = async () => {
    setLoading(true);
    try {
      const { getAllCurriculumResources } = await import("@/app/actions/admin-content");
      const data = await getAllCurriculumResources();
      setResources(data);
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "library") loadResources();
  }, [tab]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !subject || !level || !contentType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); return; }

      const fileExt = file.name.split(".").pop();
      const fileName = `curriculum/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resources")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) { toast.error(uploadError.message); return; }

      const { data: { publicUrl } } = supabase.storage.from("resources").getPublicUrl(fileName);

      const { createCurriculumResource } = await import("@/app/actions/admin-content");
      const result = await createCurriculumResource({
        title: `${curriculumType ? `[${curriculumType}] ` : ""}${title}`,
        subject,
        educationLevel: level,
        resourceType: contentType,
        topic: topic || undefined,
        description: description || undefined,
        price,
        filePath: publicUrl,
      });

      if (result.success) {
        toast.success(`${contentType} published successfully`);
        setTitle(""); setSubject(""); setLevel(""); setContentType("");
        setCurriculumType(""); setTopic(""); setDescription(""); setPrice(0); setFile(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { deleteResource } = await import("@/app/actions/admin-content");
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast.success("Resource deleted");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <BookMarked className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Curriculum Content</h1>
          <p className="text-muted-foreground font-medium mt-1">Publish KICD/KLB books, CBC & 8-4-4 resources, and university past papers</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ContentTab)}>
        <TabsList className="rounded-xl bg-white/[0.03] border border-white/5">
          <TabsTrigger value="upload" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            <Upload className="h-4 w-4 mr-2" /> Upload Content
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            <BookOpen className="h-4 w-4 mr-2" /> Content Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card className="rounded-[2rem] border-border/50">
            <CardContent className="p-8">
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. KLB Mathematics Form 1" className="h-12 rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Subject *</Label>
                    <Select value={subject} onValueChange={(v: string | null) => v && setSubject(v)} required>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Education Level *</Label>
                    <Select value={level} onValueChange={(v: string | null) => v && setLevel(v)} required>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Content Type *</Label>
                    <Select value={contentType} onValueChange={(v: string | null) => v && setContentType(v)} required>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {[...CONTENT_TYPES].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">
                      Curriculum System {contentType === "Curriculum Book" && "(Required)"}
                    </Label>
                    <Select value={curriculumType} onValueChange={(v: string | null) => v && setCurriculumType(v)}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CURRICULUM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Topic (optional)</Label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebra, Cell Division" className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest">Price (KES) — 0 for free</Label>
                    <Input type="number" min="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-12 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this resource covers..." className="rounded-xl min-h-[80px]" />
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">File * (PDF, DOC, DOCX — max 50 MB)</Label>
                  <div {...getRootProps()} className={cn(
                    "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"
                  )}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-bold">{file.name}</span>
                        <span className="text-muted-foreground text-sm">({Math.round(file.size / 1024 / 1024 * 100) / 100} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="font-bold">{isDragActive ? "Drop file here" : "Drag & drop or click to browse"}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={isUploading} className="w-full h-14 rounded-xl bg-primary font-black text-xs uppercase tracking-widest">
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                  Publish {contentType || "Resource"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : resources.length === 0 ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-bold">No content published yet</p>
                <p className="text-sm text-muted-foreground">Upload KICD/KLB books, past papers, and revision guides above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {resources.map((r) => (
                <Card key={r.id} className="rounded-2xl border-border/50 border-l-4 border-l-emerald-500">
                  <CardContent className="p-5 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black truncate">{r.title}</h3>
                        <Badge variant="secondary" className="text-[8px] uppercase tracking-widest">{r.resourceType}</Badge>
                        <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-emerald-500 border-emerald-500/30">Approved</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{r.subject}</span>
                        <span>{r.educationLevel}</span>
                        <span>{r.downloads || 0} downloads</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.filePath && (
                        <a href={r.filePath} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="rounded-xl"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                      )}
                      <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
