"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const HIGH_SCHOOL_SUBJECTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "CRE",
  "IRE",
  "Business Studies",
  "Computer Studies",
  "Agriculture",
];

const UNIVERSITY_SUBJECTS = [
  "Computer Science",
  "Information Technology",
  "Software Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Medicine & Surgery",
  "Pharmacy",
  "Nursing",
  "Law",
  "Economics",
  "Accounting",
  "Finance",
  "Business Administration",
  "Education",
  "Architecture",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Biochemistry",
  "Psychology",
  "Journalism",
];

const LEVELS = ["High School", "University"];

const TYPES = ["Notes", "Past Paper", "Revision Guide", "Reference Book", "Curriculum Book", "Other"];

export default function UploadResourcePage() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const subjects = level === "University" ? UNIVERSITY_SUBJECTS : HIGH_SCHOOL_SUBJECTS;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f && f.size <= 50 * 1024 * 1024) {
      setFile(f);
      if (f.type === "application/pdf") {
        setPreview(URL.createObjectURL(f));
      } else {
        setPreview(null);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !subject || !level || !type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload file to Supabase storage
      const supabase = (await import("@/utils/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); return; }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resources")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("resources")
        .getPublicUrl(fileName);

      // 2. Create resource via API (uses Prisma — no RLS)
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          education_level: level,
          resource_type: type,
          topic: topic || undefined,
          description: description || undefined,
          price: price || 0,
          file_path: publicUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save resource");
        return;
      }

      toast.success(
        "Your resource is under review — we will notify you when approved."
      );
      setTitle("");
      setSubject("");
      setLevel("");
      setType("");
      setPrice(0);
      setTopic("");
      setDescription("");
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tightest">
          Upload <span className="text-primary">Resource</span>
        </h1>
        <p className="text-muted-foreground font-medium">
          Share your study materials with the Edyfra community and earn from your work.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Resource Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. KCSE Mathematics Revision Notes"
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select value={subject} onValueChange={(val) => setSubject(val || "")} required>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Education Level *</Label>
            <Select value={level} onValueChange={(val) => { setLevel(val || ""); setSubject(""); }} required>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Resource Type *</Label>
            <Select value={type} onValueChange={(val) => setType(val || "")} required>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Algebra, Cell Division, Poetry"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (KES)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0 for free"
              className="h-12 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 for free resources. Earn 70% on paid sales.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this resource covers..."
            className="h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none"
          />
        </div>

        {/* File upload zone */}
        <div className="space-y-2">
          <Label>File * (PDF, DOC, DOCX — max 50 MB)</Label>
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-secondary/30"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(file.size / 1024 / 1024 * 100) / 100} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {isDragActive ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse (PDF, DOC, DOCX)
                  </p>
                </div>
              </div>
            )}
          </div>
          {file && (file.type === "application/pdf") && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> First page will be shown as preview to students
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6 pt-4 border-t border-border/50">
          <Button
            type="submit"
            disabled={isUploading}
            className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            {isUploading ? "Uploading..." : "Submit for Review"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            All resources are reviewed by our team before appearing in the marketplace.
            You'll receive a notification when your resource is approved.
          </p>
        </div>
      </form>

      {preview && type !== "Notes" && price > 0 && (
        <div className="mt-8 p-6 rounded-xl border border-border bg-secondary/50">
          <h2 className="text-xl font-black tracking-tightest mb-4">Preview (First Page Only)</h2>
          <p className="text-sm text-muted-foreground mb-2">
            To access the full resource, students will need to purchase it.
          </p>
          <div className="aspect-[4/3] rounded-xl bg-secondary overflow-hidden">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              PDF Preview Would Appear Here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
