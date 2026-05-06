"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, Trophy, Award, Clock, CheckCircle2, XCircle, ChevronRight, 
  Loader2, Info, Sparkles, RotateCcw, ArrowRight, Lock
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getUserData } from "@/app/actions/user";
import { saveChallengeAttempt } from "@/app/actions/challenge-ai";
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
  attemptsLeft?: number;
  completed?: boolean;
}

export default function ChallengesPage() {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(SESSION_CONFIG.CHALLENGE_ATTEMPT_LIMIT);

  const currentChallenge = challenges[currentIndex] || null;

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    const user = await getUserData();
    if (!user) return;

    // Fetch 5 latest challenges for user's level
    const { data, error } = await supabase
      .from("DailyChallenge")
      .select(`
        *,
        attempts:DailyChallengeAttempt(user_id, correct)
      `)
      .eq("level", user.educationLevel)
      .lte("date", new Date().toISOString())
      .order("date", { ascending: false })
      .limit(5);

    if (data) {
      // Process challenges to add attempt info
      const processed = data.map((c: any) => {
        const userAttempts = c.attempts?.filter((a: any) => a.user_id === user.id) || [];
        const completed = userAttempts.some((a: any) => a.correct);
        const attemptsLeft = SESSION_CONFIG.CHALLENGE_ATTEMPT_LIMIT - userAttempts.length;
        
        return {
          ...c,
          options: c.options || [],
          attemptsLeft: Math.max(0, attemptsLeft),
          completed
        };
      }).filter((c: any) => !c.completed || c.attemptsLeft > 0);
      
      setChallenges(processed);
    }
    setLoading(false);
  };

  const resetChallengeState = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
  };

  const handlePrevChallenge = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetChallengeState();
    }
  };

  const handleNextChallenge = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetChallengeState();
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || !currentChallenge) return;
    
    const correct = selectedOption === currentChallenge.answer;
    setSubmitted(true);
    setIsCorrect(correct);
    setAttemptsLeft(prev => Math.max(0, prev - 1));
    
    // Save attempt to database
    try {
      const user = await getUserData();
      if (user) {
        await saveChallengeAttempt(user.id, currentChallenge.id, correct);
        await fetchChallenges(); // Refresh to update attempts
      }
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
    
    if (correct) {
      toast.success("🎉 Correct! +50 Points earned.");
    } else if (attemptsLeft <= 1) {
      toast.error("❌ No attempts left for this challenge.");
    } else {
      toast.error(`❌ Not quite. ${attemptsLeft - 1} attempt(s) left.`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="p-8 text-center py-20 space-y-4">
         <Sparkles className="h-16 w-16 text-muted-foreground mx-auto" />
         <h2 className="text-2xl font-bold">No challenges available</h2>
         <p className="text-muted-foreground">Check back later for new challenges!</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Daily Challenges
            <Sparkles className="h-8 w-8 text-orange-500 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-lg">Sharpen your skills with fun challenges!</p>
        </div>
        <div className="flex gap-4">
           <Card className="bg-orange-500/10 border-orange-500/20 px-6 py-2 flex flex-col items-center">
             <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Challenge</span>
             <span className="text-2xl font-black text-orange-500">{currentIndex + 1}/{challenges.length}</span>
           </Card>
           <Card className="bg-primary/10 border-primary/20 px-6 py-2 flex flex-col items-center">
             <span className="text-xs font-bold text-primary uppercase tracking-wider">Attempts</span>
             <span className="text-2xl font-black text-primary">{attemptsLeft}</span>
           </Card>
        </div>
      </div>

      {/* Challenge Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevChallenge}
          disabled={currentIndex === 0}
          className="font-bold"
        >
          ← Previous
        </Button>
        <div className="flex gap-2">
          {challenges.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                resetChallengeState();
              }}
              className={`h-3 w-3 rounded-full transition-all ${
                i === currentIndex ? "bg-primary w-8" : 
                challenges[i].completed ? "bg-green-500" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={handleNextChallenge}
          disabled={currentIndex === challenges.length - 1}
          className="font-bold"
        >
          Next →
        </Button>
      </div>

      {/* Current Challenge */}
      {currentChallenge && (
        <motion.div
          key={currentChallenge.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-orange-500/20 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
               <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                 <Sparkles className="h-4 w-4" />
                 {currentChallenge.subject || "General"}
               </div>
               <div className="flex items-center gap-4 text-sm">
                 <span className="flex items-center gap-1">
                   <Trophy className="h-4 w-4" />
                   +50 pts
                 </span>
                 <span className="flex items-center gap-1">
                   <RotateCcw className="h-4 w-4" />
                   {attemptsLeft} attempts left
                 </span>
               </div>
            </div>
            <CardHeader className="bg-orange-500/5 pt-8">
               <div className="flex gap-2 mb-4">
                 <Badge className="bg-primary/10 text-primary border-primary/20">{currentChallenge.subject}</Badge>
                 <Badge variant="outline">{currentChallenge.level}</Badge>
                 {currentChallenge.completed && (
                   <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                     <CheckCircle2 className="h-3 w-3 mr-1" />
                     Completed
                   </Badge>
                 )}
               </div>
               <CardTitle className="text-2xl leading-relaxed">{currentChallenge.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-8">
               <div className="grid grid-cols-1 gap-3">
                 {currentChallenge.options.map((option: string, i: number) => {
                   const isSelected = selectedOption === option;
                   const showCorrect = submitted && option === currentChallenge.answer;
                   const showWrong = submitted && isSelected && !isCorrect;
                   const optionLetter = String.fromCharCode(65 + i);

                   return (
                     <motion.button
                       key={option}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       disabled={submitted || currentChallenge.completed}
                       onClick={() => setSelectedOption(option)}
                       className={`
                         group flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all
                         ${isSelected ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted bg-muted/20 hover:border-muted-foreground/30 hover:scale-[1.01]"}
                         ${showCorrect ? "border-green-500 bg-green-50 text-green-700" : ""}
                         ${showWrong ? "border-red-500 bg-red-50 text-red-700" : ""}
                         ${currentChallenge.completed && !showCorrect ? "opacity-60" : ""}
                       `}
                     >
                       <div className="flex items-center gap-4">
                         <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-black text-lg ${
                           showCorrect ? "bg-green-500 text-white" :
                           showWrong ? "bg-red-500 text-white" :
                           isSelected ? "bg-primary text-white" : "bg-muted"
                         }`}>
                           {optionLetter}
                         </div>
                         <span className="font-medium text-lg">{option}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         {showCorrect && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                         {showWrong && <XCircle className="h-6 w-6 text-red-500" />}
                         {!submitted && !currentChallenge.completed && (
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/20"}`}>
                             {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                           </div>
                         )}
                       </div>
                     </motion.button>
                   );
                 })}
               </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 flex flex-col gap-6">
               {!submitted && !currentChallenge.completed ? (
                 <Button 
                   className="w-full py-7 text-xl font-bold gap-2 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
                   disabled={!selectedOption || attemptsLeft <= 0}
                   onClick={handleSubmit}
                 >
                   Submit Answer <ArrowRight className="h-5 w-5" />
                 </Button>
               ) : submitted ? (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }} 
                   animate={{ opacity: 1, y: 0 }}
                   className={`p-6 rounded-xl border-2 w-full flex gap-4 ${isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
                 >
                   <div className={`p-3 rounded-lg h-fit ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                     {isCorrect ? <CheckCircle2 className="h-6 w-6 text-white" /> : <Info className="h-6 w-6 text-white" />}
                   </div>
                   <div className="flex-1">
                     <h4 className={`text-lg font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                       {isCorrect ? "🎉 Excellent Work!" : `😅 Not quite. ${attemptsLeft} attempt(s) left.`}
                     </h4>
                     <p className="text-muted-foreground leading-relaxed">
                       {currentChallenge.explanation}
                     </p>
                   </div>
                 </motion.div>
               ) : currentChallenge.completed ? (
                 <div className="w-full p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                   <CheckCircle2 className="h-6 w-6 text-green-500" />
                   <span className="font-bold text-green-700">You've already completed this challenge!</span>
                 </div>
               ) : null}
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
