"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function RoleChoicePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "STUDENT" | "TUTOR") => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Update metadata so middleware knows where to send them
      await supabase.auth.updateUser({
        data: { role: role }
      });

      if (role === "TUTOR") {
        router.push("/onboarding/tutor");
      } else {
        router.push("/onboarding/student");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Badge className="bg-primary/10 text-primary border-none px-4 py-1 text-xs font-black uppercase tracking-widest">The Edyfra Journey</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter">Choose Your Path</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">Are you here to master new knowledge or to share your expertise with the world?</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Student Path */}
          <motion.div
            whileHover={{ y: -10 }}
            className="relative"
          >
            <Card 
              onClick={() => selectRole("STUDENT")}
              className="cursor-pointer border-2 border-transparent hover:border-primary transition-all rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 shadow-xl"
            >
              <CardContent className="p-10 space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-8">
                  <Users className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black">I am a Scholar</h3>
                  <p className="text-muted-foreground font-medium">Access tutors, join study groups, and climb the leaderboard.</p>
                </div>
                <ul className="text-sm text-left space-y-3 font-bold text-slate-500 py-6">
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> Personalized Study Plans</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> 24/7 AI Tutor Access</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> Daily Academic Challenges</li>
                </ul>
                <Button className="w-full h-14 rounded-2xl font-black text-sm tracking-widest bg-blue-600 hover:bg-blue-700">
                  START LEARNING <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tutor Path */}
          <motion.div
            whileHover={{ y: -10 }}
            className="relative"
          >
            <Card 
              onClick={() => selectRole("TUTOR")}
              className="cursor-pointer border-2 border-transparent hover:border-teal-600 transition-all rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 shadow-xl"
            >
              <CardContent className="p-10 space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-teal-600/10 text-teal-600 flex items-center justify-center mx-auto mb-8">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black">I am an Expert</h3>
                  <p className="text-muted-foreground font-medium">Monetize your knowledge and help the next generation succeed.</p>
                </div>
                <ul className="text-sm text-left space-y-3 font-bold text-slate-500 py-6">
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> Earn Ksh for Every Session</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> Flexible Working Hours</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> Verified Expert Profile</li>
                </ul>
                <Button className="w-full h-14 rounded-2xl font-black text-sm tracking-widest bg-teal-600 hover:bg-teal-700">
                  BECOME A TUTOR <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}
