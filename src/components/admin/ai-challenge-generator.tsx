"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, BookOpen, GraduationCap, Loader2, 
  CheckCircle2, AlertTriangle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { generateChallenges } from "@/app/actions/challenge-ai";

export default function AIChallengeGenerator() {
  const [generating, setGenerating] = useState(false);
  const [level, setLevel] = useState<"HIGH_SCHOOL" | "UNIVERSITY">("HIGH_SCHOOL");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(1);
  const [generatedChallenges, setGeneratedChallenges] = useState<any[]>([]);

  const subjects = [
    "Mathematics", "Physics", "Chemistry", "Biology", 
    "Computer Science", "English", "History", "Geography",
    "Economics", "Business Studies"
  ];

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
          count
        })
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Failed to generate challenges");
      }

      setGeneratedChallenges(data.challenges || []);
      toast.success(`Generated ${data.challenges?.length || 0} challenge(s) successfully!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate challenges";
      toast.error(message);
      console.error("Error generating challenges:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI Challenge Generator
          </CardTitle>
          <CardDescription>
            Generate educational challenges using AI for students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Subject Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold">Subject (Optional)</label>
            <select 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <label className="text-sm font-bold">Specific Topic (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Quadratic Equations, Ohm's Law"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Count */}
          <div className="space-y-2">
            <label className="text-sm font-bold">Number of Challenges (Max 10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(Math.min(10, parseInt(e.target.value) || 1))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
            />
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

      {/* Generated Challenges Preview */}
      {generatedChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Generated Challenges ({generatedChallenges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedChallenges.map((challenge, index) => (
              <Card key={index} className="border-white/5 bg-white/[0.02]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary">
                      {challenge.subject || "General"}
                    </Badge>
                    <Badge variant="outline">{challenge.level}</Badge>
                  </div>
                  <p className="font-bold">{challenge.question}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {challenge.options?.map((opt: string, i: number) => (
                      <div 
                        key={i}
                        className={`p-2 rounded-lg text-sm font-bold ${
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
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}