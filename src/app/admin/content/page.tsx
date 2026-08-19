"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus, Edit3, Trash2, BookOpen,
  Calendar, Award, Search, Loader2,
  Sparkles, Filter, X, Save, CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "English", "History", "Geography",
  "Economics", "Business Studies", "Literature", "Psychology"
];

type Challenge = {
  id: string;
  date: string;
  question: string;
  subject: string;
  level: string;
  options: string[];
  answer: string;
  explanation: string;
};

type ChallengeForm = {
  question: string;
  subject: string;
  level: "HIGH_SCHOOL" | "UNIVERSITY";
  date: string;
  options: string;
  answer: string;
  explanation: string;
};

const EMPTY_FORM: ChallengeForm = {
  question: "",
  subject: "",
  level: "HIGH_SCHOOL",
  date: "",
  options: "",
  answer: "A",
  explanation: "",
};

export default function AdminContentPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeForm>(EMPTY_FORM);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      fetchAbortRef.current?.abort();
      const ctrl = new AbortController();
      fetchAbortRef.current = ctrl;
      const res = await fetch("/api/admin/challenges", { signal: ctrl.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load challenges");
      setChallenges((data.challenges || []).map((c: Challenge) => ({ ...c, date: String(c.date) })));
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
    return () => fetchAbortRef.current?.abort();
  }, [fetchChallenges]);

  const subjects = Array.from(new Set(challenges.map((c) => c.subject))).sort();

  const filtered = challenges.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.question.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    const matchesSubject = subjectFilter === "All" || c.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const todayCount = challenges.filter((c) => new Date(c.date).toDateString() === today).length;
  const tomorrowCount = challenges.filter((c) => new Date(c.date).toDateString() === tomorrow).length;
  const nextWeekCount = challenges.filter((c) => new Date(c.date) <= nextWeek && new Date(c.date).toDateString() !== today).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({
      question: c.question,
      subject: c.subject,
      level: c.level === "UNIVERSITY" ? "UNIVERSITY" : "HIGH_SCHOOL",
      date: c.date.slice(0, 10),
      options: c.options.join(", "),
      answer: c.answer,
      explanation: c.explanation || "",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.subject || !form.date) {
      toast.error("Question, subject, and date are required");
      return;
    }
    const options = form.options.split(",").map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      toast.error("Enter at least 2 options separated by commas");
      return;
    }
    if (!["A", "B", "C", "D"].includes(form.answer)) {
      toast.error("Answer must be A, B, C, or D");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        subject: form.subject,
        level: form.level,
        date: new Date(form.date).toISOString(),
        options,
        answer: form.answer,
        explanation: form.explanation.trim(),
      };

      const url = editingId ? `/api/admin/challenges?id=${editingId}` : "/api/admin/challenges";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save challenge");

      toast.success(editingId ? "Challenge updated" : "Challenge created");
      closeForm();
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || "Failed to save challenge");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    try {
      const res = await fetch(`/api/admin/challenges?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Challenge deleted");
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete challenge");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Challenge CMS</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Curate the daily quest for the Edyfra scholar community.</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl font-black gap-2 h-16 px-10 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5" /> NEW CHALLENGE
        </Button>
      </div>

      {/* Create / Edit Form */}
      {formOpen && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5 rounded-[2rem] overflow-hidden">
          <CardHeader className="p-6 border-b border-border/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black tracking-tight">
              {editingId ? "Edit Challenge" : "New Challenge"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Question</Label>
              <Textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g., Solve for x: 2x + 5 = 13"
                className="rounded-xl min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Subject</Label>
                <Select value={form.subject} onValueChange={(v: string | null) => setForm({ ...form, subject: v || "" })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Level</Label>
                <Select value={form.level} onValueChange={(v: "HIGH_SCHOOL" | "UNIVERSITY" | null) => setForm({ ...form, level: v === "UNIVERSITY" ? "UNIVERSITY" : "HIGH_SCHOOL" })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                    <SelectItem value="UNIVERSITY">University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Options (comma-separated)</Label>
                <Input
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  placeholder="2, 4, 6, 8"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Correct Answer</Label>
                <Select value={form.answer} onValueChange={(v: string | null) => setForm({ ...form, answer: v || "A" })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Explanation (optional)</Label>
              <Textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Brief explanation shown after answering"
                className="rounded-xl min-h-[60px]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Challenge"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active List */}
        <Card className="lg:col-span-2 border-border/40 bg-background rounded-[2rem] overflow-hidden">
          <CardHeader className="p-6 border-b border-border/40 flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Challenge Archive</CardTitle>
              <CardDescription>All-time history of academic quests.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="rounded-xl pl-9 w-40 sm:w-48"
                />
              </div>
              <Select value={subjectFilter} onValueChange={(v: string | null) => setSubjectFilter(v || "All")}>
                <SelectTrigger className="rounded-xl w-36">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Subjects</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center space-y-3">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="font-bold text-muted-foreground">No challenges found</p>
                <p className="text-sm text-muted-foreground/60">
                  {search || subjectFilter !== "All" ? "Try clearing your search or filters." : "Create your first challenge."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filtered.map((item) => (
                  <div key={item.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-6 min-w-0">
                      <div className="w-16 h-16 rounded-3xl bg-primary/5 text-primary flex flex-col items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors flex-shrink-0">
                        <span className="text-xs font-black uppercase tracking-widest">{new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-xl font-black">{new Date(item.date).getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-lg line-clamp-1">{item.question}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">{item.subject}</Badge>
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{item.level}</Badge>
                          <span className="text-[10px] font-semibold text-muted-foreground">Answer: {item.answer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-white/10" onClick={() => openEdit(item)} aria-label={`Edit ${item.question}`}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.question}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <div className="space-y-8">
          <Card className="border-none bg-gradient-to-br from-primary to-primary/60 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary/30">
            <Sparkles className="h-12 w-12 mb-6 opacity-40" />
            <h3 className="text-3xl font-black leading-tight mb-4">AI Quest Generator</h3>
            <p className="text-white/80 font-medium mb-8">Let Mash AI generate a curriculum-aligned challenge for tomorrow based on student activity.</p>
            <Button onClick={() => router.push("/admin/challenges")} className="w-full rounded-2xl bg-white text-primary font-black py-7 text-lg hover:bg-white/90">
              GENERATE NOW
            </Button>
          </Card>

          <Card className="border-border/40 bg-background rounded-[2.5rem] p-10">
            <h4 className="text-xl font-black mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Scheduling Status
            </h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Today</span>
                <Badge className={`border-none font-black tracking-widest ${todayCount > 0 ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}`}>
                  {todayCount > 0 ? "ACTIVE" : "MISSING"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tomorrow</span>
                <Badge className={`border-none font-black tracking-widest ${tomorrowCount > 0 ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}`}>
                  {tomorrowCount > 0 ? "SCHEDULED" : "MISSING"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Next Week</span>
                <Badge className="bg-white/5 text-muted-foreground border-none font-black tracking-widest">
                  {nextWeekCount} PLANNED
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="border-border/40 bg-background rounded-[2.5rem] p-10">
            <h4 className="text-xl font-black mb-6 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Archive Stats
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Challenges</span>
                <span className="text-2xl font-black flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {challenges.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subjects Covered</span>
                <span className="text-2xl font-black">{subjects.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}