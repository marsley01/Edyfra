"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function RoleChoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "STUDENT" | "TUTOR") => {
    setLoading(true);
    try {
      const { updateUserRole } = await import("@/app/actions/user");
      const result = await updateUserRole(role);
      
      if (result.success) {
        if (role === "TUTOR") {
          window.location.href = "/onboarding/tutor";
        } else {
          window.location.href = "/onboarding/student";
        }
      } else {
        toast.error("Selection failed", { description: result.error });
      }
    } catch (error: any) {
      console.error("Selection failed:", error);
      toast.error("System Error", { description: error.message || "We couldn't update your role. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden selection:bg-primary/30 font-sans">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-6xl w-full space-y-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 text-center"
        >
          <div className="flex justify-center">
             <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
               Choose your path
             </Badge>
          </div>
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-[0.9] text-foreground">
            What brings you <span className="text-primary">here?</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Whether you&apos;re looking for help or ready to give it — we&apos;ll tailor Edyfra to fit your needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Student Path */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="group"
          >
            <Card 
              onClick={() => selectRole("STUDENT")}
              className="cursor-pointer border-border/50 hover:border-primary transition-all duration-700 rounded-[3.5rem] overflow-hidden bg-secondary/30 backdrop-blur-3xl shadow-2xl relative group-hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <CardContent className="p-8 md:p-16 space-y-10 relative">
                <div className="w-24 h-24 rounded-[2rem] bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:rotate-12 transition-transform duration-500">
                  <Users className="h-10 w-10" />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tightest text-foreground">I want to learn.</h3>
                  <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                    Get matched with mentors who can help you understand tough topics and stay on track.
                  </p>
                </div>

                <div className="space-y-4 border-t border-border/50 pt-10">
                  {[
                    "Study partners who match your needs",
                    "Notes, past papers & study guides",
                    "Track your progress over time"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{feat}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-16 rounded-2xl font-bold text-xs tracking-widest bg-foreground text-background hover:bg-primary hover:text-white transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/30 uppercase">
                   Continue as a Student <ArrowRight className="h-4 w-4 ml-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tutor Path */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="group"
          >
            <Card 
              onClick={() => selectRole("TUTOR")}
              className="cursor-pointer border-border/50 hover:border-emerald-500 transition-all duration-700 rounded-[3.5rem] overflow-hidden bg-secondary/30 backdrop-blur-3xl shadow-2xl relative group-hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <CardContent className="p-8 md:p-16 space-y-10 relative">
                <div className="w-24 h-24 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/20 group-hover:-rotate-12 transition-transform duration-500">
                  <GraduationCap className="h-10 w-10" />
                </div>

                <div className="space-y-4">
                   <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                     <h3 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tightest text-foreground">I want to teach.</h3>
                     <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-[8px] font-black uppercase tracking-widest">Earn while helping</Badge>
                   </div>
                  <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                    Share what you know, build your reputation, and earn from every session you lead.
                  </p>
                </div>

                <div className="space-y-4 border-t border-border/50 pt-10">
                  {[
                    "Get verified and stand out",
                    "Set your own schedule & rates",
                    "Get paid weekly via M-Pesa"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{feat}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-16 rounded-2xl font-bold text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 transition-all duration-500 uppercase">
                   Apply to Tutor <ArrowRight className="h-4 w-4 ml-3" />
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
