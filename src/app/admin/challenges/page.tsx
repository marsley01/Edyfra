"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, BookOpen, GraduationCap, Loader2, 
  CheckCircle2, AlertTriangle, RefreshCw, Plus,
  Calendar, Clock, Filter, Trash2, Eye
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", 
  "Computer Science", "English", "History", "Geography",
  "Economics", "Business Studies", "Literature", "Psychology"
];

interface GeneratedChallenge {
  id?: string;
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  date?: string;
  scheduled?: boolean;
}

export default function AdminChallengesPage() {
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<GeneratedChallenge[]>([]);
  const [level, setLevel] = useState<"HIGH_SCHOOL" | "UNIVERSITY">("HIGH_SCHOOL");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(1);
  const [scheduledDate, setScheduledDate] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      toast.error("Failed to load challenges");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await fetch("/api/admin/generate-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          subject: subject || undefined,
          topic: topic || undefined,
          count,
          scheduledDate: scheduledDate || undefined
        })
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Failed to generate challenges");
      }

      toast.success(`Generated ${data.challenges?.length || 0} challenge(s) successfully!`);
      fetchChallenges();
      setShowGenerator(false);
      setTopic("");
      setSubject("");
      setScheduledDate("");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate challenges");
      console.error("Error generating challenges:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    
    try {
      const res = await fetch(`/api/admin/challenges?id=${id}`, {
        method: "DELETE"
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      toast.success("Challenge deleted");
      fetchChallenges();
    } catch (error) {
      toast.error("Failed to delete challenge");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter">Challenge Management</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">
            Generate and schedule AI-powered challenges for students
          </p>
        </div>
        <Button
          onClick={() => setShowGenerator(!showGenerator)}
          className="rounded-xl font-black text-xs tracking-widest"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showGenerator ? "Hide Generator" : "Generate Challenges"}
        </Button>
      </div>

      {/* AI Generator Panel */}
      <AnimatePresence>
        {showGenerator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-orange-500/20 bg-orange-500/5 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  AI Challenge Generator
                </CardTitle>
                <CardDescription>
                  Generate educational challenges using AI for specific education levels and subjects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Level Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Education Level</label>
                  <div className="flex gap-2">
                    <Button
                      variant={level === "HIGH_SCHOOL" ? "default" : "outline"}
                      onClick={() => setLevel("HIGH_SCHOOL")}
                      className="flex-1"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      High School
                    </Button>
                    <Button
                      variant={level === "UNIVERSITY" ? "default" : "outline"}
                      onClick={() => setLevel("UNIVERSITY")}
                      className="flex-1"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      University
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Subject (Optional)</label>
                    <Select value={subject} onValueChange={(val: string | null) => setSubject(val || "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Topic */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Specific Topic (Optional)</label>
                    <Input
                      placeholder="e.g., Quadratic Equations"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Count */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Number of Challenges (Max 10)</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={count}
                      onChange={(e) => setCount(Math.min(10, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  {/* Scheduled Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Schedule For (Optional)</label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Challenges...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Challenges
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenges List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generated Challenges ({challenges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No challenges generated yet</p>
              <Button onClick={() => setShowGenerator(true)} variant="outline">
                Generate Your First Challenge
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge, index) => (
                <motion.div
                  key={challenge.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-white/5 bg-white/[0.02] hover:border-primary/20 transition-all">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary">
                              {challenge.subject || "General"}
                            </Badge>
                            <Badge variant="outline">{challenge.level}</Badge>
                            {challenge.scheduled && (
                              <Badge className="bg-orange-500/10 text-orange-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-lg">{challenge.question}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-500/10"
                          onClick={() => challenge.id && handleDelete(challenge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {challenge.options?.map((opt: string, i: number) => (
                          <div 
                            key={i}
                            className={`p-3 rounded-lg text-sm font-bold ${
                              String.fromCharCode(65 + i) === challenge.answer 
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                : 'bg-white/5'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-xs text-muted-foreground italic">
                        {challenge.explanation}
                      </p>
                      
                      {challenge.date && (
                        <p className="text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(challenge.date).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}