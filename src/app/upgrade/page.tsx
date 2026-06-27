"use client";

import { Shield, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 flex items-center justify-center">
      <div className="max-w-3xl mx-auto text-center space-y-12">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 mb-8"
          >
            <Crown className="h-12 w-12 text-primary" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tightest"
          >
            Edyfra is currently in <span className="text-primary">Closed Beta.</span>
          </motion.h1>
          <p className="text-muted-foreground text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            We are currently rolling out institutional access exclusively to select early-adopter schools. 
            General premium upgrades and study credits will be available soon.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-[2.5rem] border border-border bg-secondary/20 max-w-xl mx-auto"
        >
          <h3 className="text-2xl font-black tracking-tightest mb-4">Are you an Institution?</h3>
          <p className="text-muted-foreground font-medium mb-8">
            Get your entire school onboarded with custom rosters, advanced analytics, and priority tutor matching.
          </p>
          <Button 
            onClick={() => window.location.href = "/contact"}
            className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Contact Sales for Access
          </Button>
        </motion.div>

        <div className="flex items-center justify-center gap-6 opacity-40 pt-8">
           <div className="flex items-center gap-2">
             <Shield className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Security</span>
           </div>
           <div className="flex items-center gap-2">
             <Star className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Priority Support</span>
           </div>
        </div>
      </div>
    </div>
  );
}
