"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Award, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getUserData } from "@/app/actions/user";

export default function ChallengesPage() {
  const supabase = createClient();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    fetchTodayChallenge();
  }, []);

  const fetchTodayChallenge = async () => {
    setLoading(true);
    const user = await getUserData();
    if (!user) return;

    const { data, error } = await supabase
      .from("DailyChallenge")
      .select("*")
      .eq("level", user.educationLevel)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setChallenge(data);
    setLoading(false);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setSubmitted(true);
    const correct = selectedOption === challenge.answer;
    setIsCorrect(correct);
    
    if (correct) {
      toast.success("Correct! +50 Points earned.");
    } else {
      toast.error("Not quite. Better luck tomorrow!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-8 text-center py-20 space-y-4">
         <Award className="h-16 w-16 text-muted-foreground mx-auto" />
         <h2 className="text-2xl font-bold">No challenge today</h2>
         <p className="text-muted-foreground">Check back later for a new problem to solve!</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Daily Challenge
            <Flame className="h-8 w-8 text-orange-500 fill-orange-500 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-lg">Sharpen your skills and climb the leaderboard.</p>
        </div>
        <div className="flex gap-4">
           <Card className="bg-orange-500/10 border-orange-500/20 px-6 py-2 flex flex-col items-center">
             <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Streak</span>
             <span className="text-2xl font-black text-orange-500">0</span>
           </Card>
           <Card className="bg-primary/10 border-primary/20 px-6 py-2 flex flex-col items-center">
             <span className="text-xs font-bold text-primary uppercase tracking-wider">Today</span>
             <span className="text-2xl font-black text-primary">+50</span>
           </Card>
        </div>
      </div>

      <Card className="border-2 border-orange-500/20 overflow-hidden shadow-xl">
        <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
             <Award className="h-4 w-4" />
             Special Quest
           </div>
           <div className="flex items-center gap-2 text-sm opacity-90">
             <Clock className="h-4 w-4" />
             Expires in 12h
           </div>
        </div>
        <CardHeader className="bg-orange-500/5 pt-8">
           <div className="flex gap-2 mb-4">
             <Badge variant="outline" className="bg-white border-orange-200 text-orange-700">{challenge.subject}</Badge>
             <Badge variant="outline" className="bg-white border-orange-200 text-orange-700">{challenge.level}</Badge>
           </div>
           <CardTitle className="text-2xl leading-relaxed">{challenge.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-8">
           <div className="grid grid-cols-1 gap-3">
             {challenge.options.map((option: string) => {
               const isSelected = selectedOption === option;
               const showCorrect = submitted && option === challenge.answer;
               const showWrong = submitted && isSelected && !isCorrect;

               return (
                 <button
                   key={option}
                   disabled={submitted}
                   onClick={() => setSelectedOption(option)}
                   className={`
                     group flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all
                     ${isSelected ? "border-primary bg-primary/5" : "border-muted bg-muted/20 hover:border-muted-foreground/30"}
                     ${showCorrect ? "border-green-500 bg-green-50 text-green-700" : ""}
                     ${showWrong ? "border-red-500 bg-red-50 text-red-700" : ""}
                   `}
                 >
                   <span className="font-medium text-lg">{option}</span>
                   <div className="flex items-center gap-2">
                     {showCorrect && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                     {showWrong && <XCircle className="h-6 w-6 text-red-500" />}
                     {!submitted && (
                       <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/20"}`}>
                         {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                       </div>
                     )}
                   </div>
                 </button>
               );
             })}
           </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t p-6 flex flex-col gap-6">
           {!submitted ? (
             <Button 
               className="w-full py-7 text-xl font-bold gap-2 shadow-lg"
               disabled={!selectedOption}
               onClick={handleSubmit}
             >
               Submit Answer <ChevronRight className="h-5 w-5" />
             </Button>
           ) : (
             <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }}
               className={`p-6 rounded-xl border-2 w-full flex gap-4 ${isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
             >
               <div className={`p-3 rounded-lg h-fit ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                 <Info className="h-6 w-6 text-white" />
               </div>
               <div>
                 <h4 className={`text-lg font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                   {isCorrect ? "Excellent Work!" : "Incorrect Answer"}
                 </h4>
                 <p className="text-muted-foreground leading-relaxed">
                   {challenge.explanation}
                 </p>
               </div>
             </motion.div>
           )}
        </CardFooter>
      </Card>
    </div>
  );
}
