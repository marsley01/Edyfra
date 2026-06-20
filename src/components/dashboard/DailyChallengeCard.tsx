"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Brain,
  Target, Zap, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  evaluateChallengeAnswer,
  saveChallengeAttempt,
  generatePersonalizedChallenge,
} from "@/app/actions/challenge-ai";
import { showError, showSuccess } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { getUserData } from "@/app/actions/user";

interface DailyChallengeCardProps {
  userId: string;
  educationLevel: string;
}

interface ChallengeData {
  id: string;
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export default function DailyChallengeCard({ userId, educationLevel }: DailyChallengeCardProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; correctAnswer: string } | null>(null);
  const [completed, setCompleted] = useState(false);

  const loadPersonalizedChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const existing = await getUserData();
      if (!existing) return;
      const newChallenge = await generatePersonalizedChallenge(userId, educationLevel);
      if (newChallenge) {
        setChallenge({
          id: newChallenge.id,
          subject: newChallenge.subject,
          level: newChallenge.level,
          question: newChallenge.question,
          options: (newChallenge.options as string[]) || [],
          answer: newChallenge.answer,
          explanation: newChallenge.explanation,
        });
        setCompleted(false);
        setResult(null);
        setSelectedOption(null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId, educationLevel]);

  useEffect(() => { loadPersonalizedChallenge(); }, [loadPersonalizedChallenge]);

  const handleSubmit = async () => {
    if (!challenge || !selectedOption) return;
    setSubmitting(true);
    try {
      const evaluation = await evaluateChallengeAnswer(challenge.id, selectedOption);
      setResult(evaluation);
      await saveChallengeAttempt(userId, challenge.id, evaluation.correct);
      setCompleted(true);
      if (evaluation.correct) {
        showSuccess("Nice! Points banked.", { description: "Mash AI is learning what you're good at." });
      }
    } catch {
      showError({ title: "Couldn't check that", cause: "", fix: "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateNew = async () => {
    setGenerating(true);
    try {
      const newChallenge = await generatePersonalizedChallenge(userId, educationLevel);
      if (newChallenge) {
        setChallenge({
          id: newChallenge.id,
          subject: newChallenge.subject,
          level: newChallenge.level,
          question: newChallenge.question,
          options: (newChallenge.options as string[]) || [],
          answer: newChallenge.answer,
          explanation: newChallenge.explanation,
        });
        setCompleted(false);
        setResult(null);
        setSelectedOption(null);
        showSuccess("Fresh challenge ready!", { description: "Tailored to your learning profile." });
      }
    } catch {
      showError({ title: "Generation failed", cause: "", fix: "Try again." });
    } finally {
      setGenerating(false);
    }
  };

  const label = ["A", "B", "C", "D"];

  return (
    <div className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-foreground to-foreground/95 text-background space-y-6 relative overflow-hidden group shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[120px] -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[100px] -ml-12 -mb-12 pointer-events-none" />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg sm:text-xl font-black tracking-tightest">
            AI Challenge
          </h3>
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-background/40">
          Personalized for you by Mash AI
        </p>
      </div>

      <div className="relative z-10 space-y-4">
        {loading || generating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs font-medium text-background/60">
              {generating ? "Mash AI is analyzing your progress..." : "Finding your challenge..."}
            </p>
          </div>
        ) : !challenge ? (
          <div className="p-6 bg-background/5 rounded-[1.5rem] border border-background/10 text-center space-y-3">
            <Zap className="h-8 w-8 text-primary mx-auto" />
            <p className="text-background/80 font-bold text-sm">No challenge yet</p>
            <Button
              onClick={handleGenerateNew}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Generate
            </Button>
          </div>
        ) : completed && result ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={challenge.id + "-result"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-5 rounded-[1.5rem] border ${
                result.correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl ${result.correct ? "bg-emerald-500" : "bg-red-500"}`}>
                    {result.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <span className="font-black text-sm">{result.correct ? "Correct!" : "Incorrect"}</span>
                </div>
                <p className="text-background/60 text-xs leading-relaxed">{result.explanation}</p>
              </div>

              <Button
                onClick={handleGenerateNew}
                disabled={generating}
                className="w-full bg-background/10 hover:bg-background/20 border border-background/20 text-background rounded-xl h-11 text-[10px] font-black uppercase tracking-widest gap-2"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                New Personalized Challenge
              </Button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] uppercase tracking-widest font-black">
                  {challenge.subject}
                </Badge>
                <Badge variant="outline" className="border-background/20 text-background/50 text-[9px] uppercase tracking-widest font-black">
                  {challenge.level.replace("_", " ")}
                </Badge>
              </div>

              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-relaxed text-background/90">
                  {challenge.question}
                </p>
              </div>

              <div className="space-y-2">
                {challenge.options.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={submitting}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                      selectedOption === opt
                        ? "border-primary bg-primary/15 text-background"
                        : "border-background/15 bg-background/5 text-background/70 hover:border-background/30"
                    }`}
                  >
                    <span className="font-black mr-2.5 text-xs">{label[i]}.</span>
                    <span className="text-sm">{opt}</span>
                  </button>
                ))}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedOption}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-11 font-black uppercase tracking-widest text-[10px] gap-2"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Submit Answer
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
