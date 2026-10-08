"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type NewsletterSubscriptionResult = {
  success: boolean;
  message: string;
};

export function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<NewsletterSubscriptionResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Please enter a valid email" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing_page" }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({ success: true, message: "You're on the list! We'll keep you posted." });
        setEmail("");
      } else {
        setResult({ success: false, message: data.error || "Something went wrong. Please try again." });
      }
    } catch (error) {
      setResult({ success: false, message: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 border-y border-border/30">
      <div className="container-max space-y-8">
        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-center">
          Get the latest from Edyfra
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto text-center">
          Study tips, platform updates, and exclusive opportunities delivered to your inbox.
        </p>
        
        {result && (
          <div className={`p-4 rounded-xl text-center ${
            result.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
          }`}>
            <p className={`${result.success ? "text-green-600" : "text-red-600"} font-medium`}>
              {result.message}
            </p>
          </div>
        )}
        {/* Keep the form visible after an error so the visitor can retry. */}
        {!result?.success && (
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 md:w-[280px]"
              disabled={isSubmitting}
              autoComplete="email"
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !email || !email.includes("@")}
              className="h-14 px-8"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}