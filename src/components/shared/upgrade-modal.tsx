"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  feature?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  title = "Unlock Edyfra Plus",
  description = "This is a premium feature. Upgrade your account to get full access and level up your learning experience.",
  feature,
}: UpgradeModalProps) {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-none bg-background shadow-2xl">
        {/* Header Visual */}
        <div className="h-32 bg-primary/10 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 relative z-10">
            <Crown className="h-8 w-8 text-white" />
          </div>
          {/* Decorative particles */}
          <Sparkles className="absolute top-4 right-8 h-4 w-4 text-primary/40 animate-pulse" />
          <Zap className="absolute bottom-6 left-10 h-4 w-4 text-primary/40 animate-bounce" />
        </div>

        <div className="p-8 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Plus Feature</span>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tightest leading-tight">
              {feature ? `Unlock ${feature}` : title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium text-base leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button 
              onClick={() => {
                onClose();
                router.push("/upgrade");
              }}
              className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Upgrade for KES 299/month
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </Button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest">
            Instant activation • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
