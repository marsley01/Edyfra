"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, CheckCircle2, XCircle, ChevronRight,
  Loader2, Info, Sparkles, RotateCcw, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getUserData } from "@/app/actions/user";
import {
  getChallengesForUser,
  evaluateChallengeAnswer,
  saveChallengeAttempt,
  getOrCreateDailyChallenge,
} from "@/app/actions/challenge-ai";
import { SESSION_CONFIG } from "@/lib/config";

interface Challenge {
  id: string;
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  date: string;
  completed?: boolean;
  hasAttempt?: boolean;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [resultExplanation, setResultExplanation] = useState("");

  const currentChallenge = challenges[currentIndex] || null;

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const user = await getUserData();
      if (!user?.educationLevel) {
        setChallenges([]);
        return;
      }

      let data = await getChallengesForUser(user.id, user.educationLevel);
      if (data.length === 0) {
        setGenerating(true);
        await getOrCreateDailyChallenge(user.educationLevel);
        data = await getChallengesForUser(user.id, user.educationLevel);
      }

      const playable = data.filter((c) => !c.completed);
      setChallenges(playable.length > 0 ? playable : data.slice(0, 5));
      setCurrentIndex(0);
      resetChallengeState();
    } catch (err) {
      console.error("Failed to load challenges:", err);
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const resetChallengeState = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
    setResultExplanation("");
  };

  const handleSubmit = async () => {
    if (!selectedOption || !currentChallenge) return;

    const user = await getUserData();
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    setSubmitted(true);
    try {
      const evaluation = await evaluateChallengeAnswer(currentChallenge.id, selectedOption);
      setIsCorrect(evaluation.correct);
      setResultExplanation(evaluation.explanation);
      await saveChallengeAttempt(user.id, currentChallenge.id, evaluation.correct);

      if (evaluation.correct) {
        toast.success("Correct! Points awarded.");
      } else {
        toast.error("Not quite — review the explanation below.");
      }
      await fetchChallenges();
    } catch (err) {
      console.error("Failed to submit challenge:", err);
      toast.error("Failed to evaluate answer");
      setSubmitted(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          {generating ? "Generating today&apos;s AI challenge..." : "Loading challenges..."}
        </p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="p-8 text-center py-20 space-y-4">
        <Sparkles className="h-16 w-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">No challenges available</h2>
        <p className="text-muted-foreground">
          We couldn&apos;t load or generate a challenge right now. This is usually an AI service or data issue, so try again in a moment.
        </p>
        <Button onClick={fetchChallenges} className="rounded-xl">Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Daily Challenges
            <Sparkles className="h-8 w-8 text-orange-500 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-lg">AI-generated questions — earn points when you get them right.</p>
        </div>
        <Card className="bg-orange-500/10 border-orange-500/20 px-6 py-2 flex flex-col items-center">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Challenge</span>
          <span className="text-2xl font-black text-orange-500">{currentIndex + 1}/{challenges.length}</span>
        </Card>
      </div>

      {currentChallenge && (
        <motion.div key={currentChallenge.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-2 border-orange-500/20 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
              <span className="font-bold uppercase tracking-widest text-sm">{currentChallenge.subject}</span>
              <span className="flex items-center gap-1 text-sm">
                <Trophy className="h-4 w-4" /> +{SESSION_CONFIG.CHALLENGE_MEDIUM_POINTS} pts
              </span>
            </div>
            <CardHeader className="bg-orange-500/5 pt-8">
              <div className="flex gap-2 mb-4 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">{currentChallenge.subject}</Badge>
                <Badge variant="outline">{currentChallenge.level.replace("_", " ")}</Badge>
              </div>
              <CardTitle className="text-2xl leading-relaxed">{currentChallenge.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-8">
              {currentChallenge.options.map((option, i) => {
                const isSelected = selectedOption === option;
                const showCorrect = submitted && option === currentChallenge.answer;
                const showWrong = submitted && isSelected && !isCorrect;
                const letter = String.fromCharCode(65 + i);

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-muted bg-muted/20 hover:border-muted-foreground/30"
                    } ${showCorrect ? "border-green-500 bg-green-50 text-green-700" : ""} ${
                      showWrong ? "border-red-500 bg-red-50 text-red-700" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-black ${
                        showCorrect ? "bg-green-500 text-white" : showWrong ? "bg-red-500 text-white" : isSelected ? "bg-primary text-white" : "bg-muted"
                      }`}>
                        {letter}
                      </div>
                      <span className="font-medium text-lg">{option}</span>
                    </div>
                    {showCorrect && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                    {showWrong && <XCircle className="h-6 w-6 text-red-500" />}
                  </button>
                );
              })}
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 flex flex-col gap-4">
              {!submitted ? (
                <Button
                  className="w-full py-7 text-xl font-bold"
                  disabled={!selectedOption}
                  onClick={handleSubmit}
                >
                  Submit Answer <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <div className={`p-6 rounded-xl border-2 flex gap-4 ${isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className={`p-3 rounded-lg h-fit ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                    {isCorrect ? <CheckCircle2 className="h-6 w-6 text-white" /> : <Info className="h-6 w-6 text-white" />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                      {isCorrect ? "Excellent work!" : "Keep practicing!"}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">{resultExplanation || currentChallenge.explanation}</p>
                  </div>
                </div>
              )}
              {submitted && currentIndex < challenges.length - 1 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCurrentIndex((i) => i + 1);
                    resetChallengeState();
                  }}
                >
                  Next Challenge <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      )}

      <div className="flex justify-center">
        <Button variant="ghost" onClick={fetchChallenges} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Refresh challenges
        </Button>
      </div>
    </div>
  );
}
