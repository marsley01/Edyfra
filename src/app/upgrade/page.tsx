"use client";

import { useState } from "react";
import { Check, Shield, Zap, Clock, Star, Crown, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for casual study",
    features: [
      "10 Mash AI chats per day",
      "Standard peer matching",
      "1 Daily challenge",
      "Last 3 sessions history",
      "Knowledge feed access",
    ],
    buttonText: "Current Plan",
    current: true,
  },
  {
    name: "Edyfra Plus",
    price: "299",
    yearlyPrice: "2499",
    description: "The ultimate scholarly experience",
    features: [
      "Unlimited Mash AI",
      "Priority peer matching",
      "Full tutor access",
      "Unlimited challenges",
      "Full session history",
      "Plus badge on profile",
      "All dashboard themes",
      "Ad-free experience",
    ],
    buttonText: "Upgrade to Plus",
    popular: true,
  },
];

export default function UpgradePage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const planId = billingCycle === "monthly" ? "plus_monthly" : "plus_yearly";
      const amount = billingCycle === "monthly" ? 299 : 2499;

      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: "subscription",
          id: planId,
        }),
      });

      const data = await res.json();

      if (data.success && data.authorization_url) {
        toast.success("Redirecting to secure gateway...");
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tightest"
          >
            Level up your <span className="text-primary">learning.</span>
          </motion.h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto">
            Choose the plan that fits your academic goals. Secure institutional checkout.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center items-center gap-4">
          <span className={`text-sm font-bold ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-14 h-8 bg-secondary rounded-full p-1 transition-all relative"
          >
            <div className={`w-6 h-6 bg-primary rounded-full transition-all ${billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>Yearly</span>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full uppercase">Save KES 1,089</span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 rounded-[2.5rem] border ${plan.popular ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-secondary/20"} space-y-8 relative overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-6 right-6 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-1.5">
                  <Crown className="h-3 w-3" /> Most Popular
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tightest">{plan.name}</h3>
                <p className="text-muted-foreground text-sm font-medium">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tightest">KES {billingCycle === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.price}</span>
                <span className="text-muted-foreground font-medium text-sm">/{billingCycle === "yearly" ? "year" : "month"}</span>
              </div>

              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.current ? (
                <Button disabled variant="outline" className="w-full h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest">
                  Current Plan
                </Button>
              ) : (
                <Button 
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                  {loading ? "Preparing..." : "Confirm Upgrade"}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 opacity-40">
           <div className="flex items-center gap-2">
             <Shield className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Compliant</span>
           </div>
           <div className="flex items-center gap-2">
             <Star className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Verified Merchant</span>
           </div>
        </div>
      </div>
    </div>
  );
}
