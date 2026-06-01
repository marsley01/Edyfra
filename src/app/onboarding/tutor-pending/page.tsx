"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function TutorPendingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-12 selection:bg-primary/30 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="border-border/50 shadow-2xl rounded-[3rem] overflow-hidden bg-secondary/30 backdrop-blur-3xl">
          <CardContent className="p-12 md:p-16 space-y-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 20, delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tightest">
                Application <span className="text-primary">Submitted!</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Your tutor application has been submitted successfully. Our admin team will review your application and get back to you soon.
              </p>
            </div>

            <div className="space-y-6 border-t border-border/50 pt-10">
              <div className="flex items-center gap-4 p-6 rounded-2xl bg-secondary/50">
                <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="font-black text-sm uppercase tracking-widest">Review Time</p>
                  <p className="text-muted-foreground text-sm">Typically within 2-3 business days</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 rounded-2xl bg-secondary/50">
                <Mail className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="font-black text-sm uppercase tracking-widest">Notification</p>
                  <p className="text-muted-foreground text-sm">You'll receive an email once approved</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex-1 h-16 rounded-2xl font-black text-xs tracking-[0.3em] uppercase bg-secondary hover:bg-secondary/80 text-foreground"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex-1 h-16 rounded-2xl font-black text-xs tracking-[0.3em] uppercase bg-primary hover:bg-primary/90 text-white"
              >
                Explore as Student
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
