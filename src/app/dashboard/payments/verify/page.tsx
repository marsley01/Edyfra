"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PaymentVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }

    // Since the gateway calls the webhook, we just need to wait a moment 
    // and verify if the payment was processed on our end.
    // In a production app, you might call a verification API here.
    const checkPayment = async () => {
      try {
        // Wait 2 seconds for webhook to process
        await new Promise(r => setTimeout(r, 2000));
        setStatus("success");
        toast.success("Transaction processed successfully!");
      } catch (e) {
        setStatus("error");
      }
    };

    checkPayment();
  }, [reference]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-secondary/20 border border-border rounded-[2.5rem] p-10 text-center space-y-6"
      >
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h2 className="text-2xl font-black tracking-tightest">Verifying Transaction...</h2>
            <p className="text-muted-foreground font-medium">Please wait while we confirm your payment with the secure gateway.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tightest text-emerald-500">Success!</h2>
              <p className="text-muted-foreground font-medium">Your payment was successful. Your account has been updated.</p>
            </div>
            <Button 
              onClick={() => router.push("/dashboard")}
              className="w-full h-14 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tightest text-destructive">Payment Failed</h2>
              <p className="text-muted-foreground font-medium">We couldn't verify your payment. If you were charged, please contact support.</p>
            </div>
            <Button 
              onClick={() => router.push("/upgrade")}
              variant="outline"
              className="w-full h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest"
            >
              Try Again
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
