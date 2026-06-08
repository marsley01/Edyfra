"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getOrCreateDailyChallenge,
  evaluateChallengeAnswer,
  saveChallengeAttempt,
  getTodaysChallenge,
  getChallengeCompletion,
  generatePersonalizedChallenge,
} from "@/app/actions/challenge-ai";
import { showError, showSuccess } from "@/lib/toast";

interface DailyChallengeCardProps {
  userId: string;
  educationLevel: string;
}

export default function DailyChallengeCard({ userId, educationLevel }: DailyChallengeCardProps) {
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; correctAnswer: string } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [completedAttempt, setCompletedAttempt] = useState<any>(null);
  const [generatingPersonalized, setGeneratingPersonalized] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, []);

  const loadChallenge = async () => {
    setLoading(true);
    try {
      const existing = await getTodaysChallenge(educationLevel);
      if (existing) {
        setChallenge(existing);
        const attempt = await getChallengeCompletion(userId, existing.id!);
        if (attempt) {
          setCompleted(true);
          setCompletedAttempt(attempt);
          computeCountdown();
        }
        return;
      }
      const newChallenge = await getOrCreateDailyChallenge(educationLevel);
      if (newChallenge) {
        setChallenge(newChallenge);
        const attempt = await getChallengeCompletion(userId, newChallenge.id!);
        if (attempt) {
          setCompleted(true);
          setCompletedAttempt(attempt);
          computeCountdown();
        }
      }
    } catch (err) {
      console.error("Failed to load challenge:", err);
    } finally {
      setLoading(false);
    }
  };

  const computeCountdown = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    setCountdown(`${h}h ${m}m`);
  };

  const challengeOptions: string[] = Array.isArray(challenge?.options)
    ? (challenge.options as string[])
    : [];

  const handleSubmitAnswer = async () => {
    const answerText = challengeOptions.length >= 2 ? selectedOption : userAnswer.trim();
    if (!challenge || !answerText) return;
    setSubmitting(true);
    try {
      const evaluation = await evaluateChallengeAnswer(challenge.id, answerText);
      setResult(evaluation);
      await saveChallengeAttempt(userId, challenge.id, evaluation.correct);
      if (evaluation.correct) {
        showSuccess("Correct!", { description: "Points awarded — keep that streak going." });
      }
      setCompleted(true);
      computeCountdown();
    } catch (err) {
      showError({
        title: "We couldn't check that answer",
        cause: "A hiccup on our side blocked the evaluation.",
        fix: "Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePersonalized = async () => {
    setGeneratingPersonalized(true);
    try {
      const personalizedChallenge = await generatePersonalizedChallenge(userId, educationLevel);
      if (personalizedChallenge) {
        setChallenge(personalizedChallenge);
        showSuccess("Personalized challenge generated!", {
          description: "Based on your recent performance.",
        });
      }
    } catch (error) {
      showError({
        title: "We couldn't generate that challenge",
        cause: "A hiccup on our side stopped it.",
        fix: "Please try again.",
      });
    } finally {
      setGeneratingPersonalized(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-foreground text-background space-y-6 sm:space-y-10 relative overflow-hidden group shadow-2xl">
      <div className="relative z-10 space-y-2">
        <h3 className="text-2xl sm:text-3xl font-black tracking-tightest flex items-center gap-3">
          Daily Challenge
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
        </h3>
        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-background/40">
          Test yourself and earn points
        </p>
      </div>
      <div className="relative z-10 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !challenge ? (
          <div className="p-6 bg-background/5 rounded-[1.5rem] border border-background/10 text-center space-y-2">
            <p className="text-background/60 font-medium">No challenge available today.</p>
            <p className="text-background/40 text-sm">Come back tomorrow!</p>
          </div>
        ) : completed && result ? (
          <div className="space-y-4">
            <div className={`p-6 rounded-[1.5rem] border ${result.correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${result.correct ? "bg-green-500" : "bg-red-500"}`}>
                  {result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <span className="font-bold text-lg">{result.correct ? "Correct!" : "Incorrect"}</span>
              </div>
              <p className="text-background/70 text-sm leading-relaxed">{result.explanation}</p>
              {!result.correct && (
                <p className="text-primary font-bold mt-2 text-sm">Correct answer: {result.correctAnswer}</p>
              )}
            </div>
            <div className="p-4 bg-background/5 rounded-xl border border-background/10 text-center space-y-2">
              <p className="text-background/60 font-medium">Challenge completed!</p>
              <p className="text-primary font-black text-sm">Come back tomorrow</p>
              <div className="flex items-center justify-center gap-2 text-background/40 text-xs">
                <Clock className="h-3 w-3" />
                <span>Next challenge in {countdown}</span>
              </div>
            </div>
          </div>
        ) : completed && completedAttempt ? (
          <div className="space-y-4">
            <div className="p-6 bg-background/5 rounded-[1.5rem] border border-background/10 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <p className="text-background font-bold text-lg">Already Completed</p>
              <p className="text-background/60 text-sm">
                Score: {completedAttempt.correct ? "+" : ""}{completedAttempt.pointsEarned || 0} pts
              </p>
              <div className="flex items-center justify-center gap-2 text-background/40 text-xs">
                <Clock className="h-3 w-3" />
                <span>Next challenge in {countdown}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-widest font-black">
                {challenge?.subject || "General"}
              </Badge>
              <Badge variant="outline" className="border-background/20 text-background/60 text-[10px] uppercase tracking-widest font-black">
                {challenge?.level?.replace("_", " ") || "HIGH SCHOOL"}
              </Badge>
            </div>
            <p className="text-lg font-medium leading-relaxed text-background/90">
              {challenge?.question || "Loading challenge..."}
            </p>
            {challengeOptions.length >= 2 ? (
              <div className="space-y-2">
                {challengeOptions.map((option, i) => (
                  <button
                    key={option}
                    type="button"
                    disabled={submitting}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedOption === option
                        ? "border-primary bg-primary/20 text-background"
                        : "border-background/20 bg-background/5 text-background/80 hover:border-background/40"
                    }`}
                  >
                    <span className="font-black mr-3">{String.fromCharCode(65 + i)}.</span>
                    {option}
                  </button>
                ))}
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !selectedOption}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-black uppercase tracking-widest text-xs"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Answer"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 bg-background/10 border-background/20 text-background placeholder:text-background/40 rounded-xl h-12"
                  disabled={submitting}
                />
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !userAnswer.trim()}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-4"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-background/10">
              <Button
                onClick={handleGeneratePersonalized}
                disabled={generatingPersonalized}
                variant="outline"
                className="w-full bg-background/10 border-background/20 text-background hover:bg-background/20 font-black text-xs tracking-widest uppercase"
              >
                {generatingPersonalized ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                Generate Personalized Challenge
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/20 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2" />
    </div>
  );
}
