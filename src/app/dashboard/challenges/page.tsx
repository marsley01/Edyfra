"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, CheckCircle2, XCircle, Loader2, Sparkles,
  Brain, Target, Zap, Star, TrendingUp, BookOpen,
  RefreshCw, ArrowRight, GraduationCap, Flame, Shield,
  Lightbulb,
} from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { getUserData } from "@/app/actions/user";
import {
  getChallengeStats,
  evaluateChallengeAnswer,
  saveChallengeAttempt,
  generatePersonalizedChallenge,
} from "@/app/actions/challenge-ai";
import { SESSION_CONFIG } from "@/lib/config";

interface ChallengeData {
  id: string;
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface UserData {
  id: string;
  name: string;
  points: number;
  streakDays: number;
  tier: string;
  educationLevel: string;
}

interface StatsData {
  totalChallenges: number;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
}

export default function ChallengesPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [resultExplanation, setResultExplanation] = useState("");
  const [completedToday, setCompletedToday] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = loading || generating;

  const loadUserData = useCallback(async () => {
    try {
      const data = await getUserData();
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        points: data.points,
        streakDays: data.streakDays,
        tier: data.tier,
        educationLevel: data.educationLevel || "HIGH_SCHOOL",
      };
    } catch {
      return null;
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      return await getChallengeStats();
    } catch {
      return null;
    }
  }, []);

  const generateChallenge = useCallback(async (eduLevel: string) => {
    setGenerating(true);
    setError(null);
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
    setResultExplanation("");
    try {
      const userData = await getUserData();
      if (!userData) throw new Error("No user");
      const result = await generatePersonalizedChallenge(userData.id, eduLevel);
      if (!result) throw new Error("Generation returned empty");
      setChallenge({
        id: result.id,
        subject: result.subject,
        level: result.level,
        question: result.question,
        options: (result.options as string[]) || [],
        answer: result.answer,
        explanation: result.explanation,
      });
      setCompletedToday(false);
    } catch (err) {
      console.error("Failed to generate challenge:", err);
      setError("AI couldn't generate a challenge right now. Try again.");
    } finally {
      setGenerating(false);
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, statsData] = await Promise.all([loadUserData(), loadStats()]);
      setUser(userData);
      setStats(statsData);
      if (userData?.educationLevel) {
        await generateChallenge(userData.educationLevel);
      }
    } catch {
      setError("Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }, [loadUserData, loadStats, generateChallenge]);

  useEffect(() => { init(); }, [init]);

  const handleSubmit = async () => {
    if (!selectedOption || !challenge || !user) return;
    setSubmitted(true);
    try {
      const evaluation = await evaluateChallengeAnswer(challenge.id, selectedOption);
      setIsCorrect(evaluation.correct);
      setResultExplanation(evaluation.explanation);
      await saveChallengeAttempt(user.id, challenge.id, evaluation.correct);
      setCompletedToday(true);

      if (evaluation.correct) {
        showSuccess("Correct! You smashed it.", { description: `Points awarded — your streak is alive.` });
      } else {
        showError({ title: "Not quite", cause: "", fix: "Read the explanation, learn from it, and try the next one." });
      }

      const [freshUser, freshStats] = await Promise.all([loadUserData(), loadStats()]);
      if (freshUser) setUser(freshUser);
      if (freshStats) setStats(freshStats);
    } catch {
      showError({ title: "Couldn't grade your answer", cause: "Our AI checker hiccuped.", fix: "Try again." });
      setSubmitted(false);
    }
  };

  const handleNewChallenge = () => {
    if (user?.educationLevel) generateChallenge(user.educationLevel);
  };

  /* ─── Loading ─── */
  if (isGenerating && !challenge) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full blur-xl animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-foreground">Mash AI is crafting your challenge...</p>
          <p className="text-sm text-muted-foreground">Analyzing your strengths and areas to improve</p>
        </div>
        <div className="flex gap-2">
          {["Mathematics", "Physics", "Chemistry"].map((s) => (
            <div key={s} className="px-3 py-1.5 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground animate-pulse">
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (error && !challenge) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Brain className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-center">Something went wrong</h2>
        <p className="text-muted-foreground text-center max-w-sm">{error}</p>
        <Button onClick={init} className="rounded-xl gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* ─── Personalized Hero ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-6 md:p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Hey {user?.name?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Mash AI picked today&apos;s challenge just for you
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-black text-amber-500">{user?.streakDays || 0} day streak</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary">{user?.points || 0} pts</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-black text-violet-500 uppercase">{user?.tier || "BRONZE"}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Challenge Area ─── */}
        <div className="lg:col-span-2 space-y-4">
          {challenge ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-3xl border border-border/50 bg-background overflow-hidden shadow-xl"
              >
                {/* Challenge Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/30 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-lg">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">
                          {challenge.subject}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/50">
                          {challenge.level.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">
                        AI-generated for your level
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Points</p>
                    <p className="text-lg font-black text-amber-500">+{SESSION_CONFIG.CHALLENGE_MEDIUM_POINTS}</p>
                  </div>
                </div>

                {/* Question */}
                <div className="px-6 py-6 md:px-8 md:py-8">
                  <div className="flex items-start gap-3 mb-6">
                    <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-lg md:text-xl font-bold leading-relaxed text-foreground">
                      {challenge.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {challenge.options.map((option, i) => {
                      const isSelected = selectedOption === option;
                      const showCorrect = submitted && option === challenge.answer;
                      const showWrong = submitted && isSelected && !isCorrect;

                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={submitted}
                          onClick={() => setSelectedOption(option)}
                          className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                            showCorrect
                              ? "border-emerald-500 bg-emerald-500/10"
                              : showWrong
                              ? "border-red-500 bg-red-500/10"
                              : isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              showCorrect
                                ? "bg-emerald-500 text-white"
                                : showWrong
                                ? "bg-red-500 text-white"
                                : isSelected
                                ? "bg-primary text-white"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {optionLabels[i]}
                          </div>
                          <span
                            className={`font-medium text-sm md:text-base ${
                              showCorrect
                                ? "text-emerald-600 dark:text-emerald-400"
                                : showWrong
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground"
                            }`}
                          >
                            {option}
                          </span>
                          {showCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />}
                          {showWrong && <XCircle className="h-5 w-5 text-red-500 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border/30 px-6 py-5 bg-secondary/20 space-y-4">
                  {!submitted ? (
                    <Button
                      size="lg"
                      className="w-full h-14 rounded-2xl text-base font-black gap-2 shadow-lg shadow-primary/20"
                      disabled={!selectedOption}
                      onClick={handleSubmit}
                    >
                      Submit Answer <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <div
                        className={`p-5 rounded-2xl border-2 flex gap-4 ${
                          isCorrect
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-red-500/10 border-red-500/20"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isCorrect ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          ) : (
                            <Lightbulb className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h4
                            className={`font-black text-base mb-1 ${
                              isCorrect
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isCorrect ? "You got it right! 🎉" : "Not quite right"}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {resultExplanation || challenge.explanation}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-14 rounded-2xl text-base font-black gap-2"
                        onClick={handleNewChallenge}
                      >
                        <Sparkles className="h-5 w-5" />
                        Generate Next Challenge
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="rounded-3xl border border-border/50 bg-background p-12 text-center space-y-4">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-bold">No challenge loaded</p>
              <Button onClick={handleNewChallenge} className="rounded-xl gap-2">
                <Sparkles className="h-4 w-4" /> Generate a Challenge
              </Button>
            </div>
          )}

          {/* Generate new button (when not submitted) */}
          {challenge && !submitted && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChallenge}
                disabled={generating}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                Generate a different challenge
              </Button>
            </div>
          )}
        </div>

        {/* ─── Sidebar Stats ─── */}
        <div className="space-y-4">
          {/* Learning Profile */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-border/50 bg-background p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Your Profile
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tier</span>
                <span className="text-xs font-black uppercase">{user?.tier || "BRONZE"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Level</span>
                <span className="text-xs font-black uppercase">{user?.educationLevel?.replace("_", " ") || "HIGH SCHOOL"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Streak</span>
                <span className="text-xs font-black text-amber-500">{user?.streakDays || 0} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Points</span>
                <span className="text-xs font-black text-primary">{user?.points || 0}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Overall Accuracy</span>
                <span className="text-xs font-black">{stats?.successRate || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats?.successRate || 0}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-background p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Insights
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-foreground">AI-Powered</p>
                  <p className="text-[9px] text-muted-foreground">Challenges adapt to your performance</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                <BookOpen className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-foreground">{stats?.totalChallenges || 0} Challenges</p>
                  <p className="text-[9px] text-muted-foreground">{stats?.totalAttempts || 0} attempts logged</p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest"
              onClick={handleNewChallenge}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              New Challenge
            </Button>
          </motion.div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/10 p-5"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Pro Tip</p>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                  Every challenge you complete helps Mash AI understand your learning style better. The more you do, the smarter your challenges get.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
