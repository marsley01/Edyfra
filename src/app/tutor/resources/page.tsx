"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, Plus, Check, X, Clock, Loader2, LibraryBig, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { createResource, getMyResources } from "@/app/actions/resources";
import { motion, AnimatePresence } from "framer-motion";

const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Physics", "Chemistry",
  "Biology", "History", "Geography", "CRE", "IRE",
  "Business Studies", "Computer Studies", "Agriculture",
];
const LEVELS = ["High School", "University", "Primary"];
const TYPES = ["Notes", "Past Paper", "Revision Guide", "Reference Book", "Curriculum Book", "Other"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};
const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: Check,
  rejected: X,
};

export default function TutorResourcesPage() {
  const [view, setView] = useState<"list" | "upload">("list");
  const [myResources, setMyResources] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoadingList(true);
    try {
      const data = await getMyResources();
      setMyResources(data);
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoadingList(false);
    }
  };

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
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const resetForm = () => {
    setTitle(""); setSubject(""); setLevel(""); setType("");
    setPrice(0); setTopic(""); setDescription(""); setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !subject || !level || !type) {
      toast.error("Please fill in all required fields and attach a file");
      return;
    }
    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); return; }

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error("File upload failed: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("resources").getPublicUrl(fileName);

      // Use server action to insert (bypasses RLS)
      const result = await createResource({
        title, subject,
        education_level: level,
        resource_type: type,
        topic: topic || undefined,
        description: description || undefined,
        price,
        file_path: publicUrl,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Resource submitted for review! We'll notify you once it's approved.");
      resetForm();
      setView("list");
      loadResources();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tightest">
            My <span className="text-primary">Resources</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Upload study materials and earn from every sale.
          </p>
        </div>
        {view === "list" ? (
          <Button onClick={() => setView("upload")} className="rounded-2xl gap-2 font-black text-xs uppercase tracking-widest h-12 px-6">
            <Plus className="h-4 w-4" /> Upload Resource
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => { setView("list"); resetForm(); }} className="rounded-2xl gap-2">
            ← Back to My Resources
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loadingList ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myResources.length === 0 ? (
              <div className="text-center py-24 space-y-6 border-2 border-dashed border-border rounded-[2rem]">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <PackageOpen className="h-10 w-10 text-primary/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black">No resources yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Upload your first study material and start earning from students on Edyfra.
                  </p>
                </div>
                <Button onClick={() => setView("upload")} className="rounded-full gap-2 font-black text-xs uppercase tracking-widest h-12 px-8">
                  <Plus className="h-4 w-4" /> Upload Your First Resource
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myResources.map((r: any, i) => {
                  const StatusIcon = STATUS_ICONS[r.status] || Clock;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-6 rounded-[2rem] border border-border bg-card space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <LibraryBig className="h-6 w-6 text-primary" />
                        </div>
                        <Badge className={`text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[r.status] || STATUS_COLORS.pending}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {r.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black tracking-tight leading-tight">{r.title}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{r.subject} · {r.education_level}</p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-xs font-bold text-muted-foreground">{r.downloads || 0} downloads</span>
                        <span className="text-lg font-black">{r.price === 0 ? "Free" : `KES ${r.price}`}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Resource Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. KCSE Maths Paper 1 2023" className="h-12 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Select value={subject} onValueChange={val => setSubject(val || "")}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Education Level *</Label>
                  <Select value={level} onValueChange={val => setLevel(val || "")}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resource Type *</Label>
                  <Select value={type} onValueChange={val => setType(val || "")}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Topic (optional)</Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Algebra, Cell Division" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Price (KES) — 0 for Free</Label>
                  <Input type="number" min="0" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="0" className="h-12 rounded-xl" />
                  <p className="text-xs text-muted-foreground">You earn 70% of every paid sale.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what this resource covers..." className="h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none" />
              </div>

              <div className="space-y-2">
                <Label>File * (PDF, DOC, DOCX — max 50 MB)</Label>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"}`}>
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="p-1 text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{isDragActive ? "Drop your file here" : "Drag & drop or click to browse"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 50 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={isUploading} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest">
                {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Submit for Review"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                All resources are reviewed by our team before going live. You'll be notified when approved.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
