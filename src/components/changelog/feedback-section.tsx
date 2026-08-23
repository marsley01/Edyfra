"use client";

import { useState } from "react";
import { Bug, Zap, Lightbulb, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitFeedback } from "@/app/actions/feedback";
import { showError, showSuccess } from "@/lib/toast";
import { MiniBlobs } from "@/components/ui/mini-blobs";

type Category = "bug" | "complaint" | "idea";

/**
 * "Help us improve" form shown at the bottom of the changelog.
 * Reports land in Admin → Feedback Inbox via submitFeedback().
 */
export function FeedbackSection() {
  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await submitFeedback({
        category,
        subject: subject.trim() || undefined,
        message: message.trim(),
        context: "/changelog",
      });
      if (res.error) {
        showError({
          title: "Couldn't send your feedback",
          cause: res.error,
          fix: res.error.includes("logged in") ? "Sign in and try again." : "Try again in a moment.",
        });
      } else {
        setSent(true);
        setMessage("");
        setSubject("");
        showSuccess("Feedback received", {
          description: "Our team reviews every report — thank you!",
        });
        setTimeout(() => setSent(false), 6000);
      }
    } catch {
      showError({ title: "Couldn't send your feedback", cause: "Network hiccup.", fix: "Try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      className="relative overflow-hidden max-w-3xl mx-auto mt-20 rounded-[2.5rem] border border-border bg-card p-8 sm:p-12 shadow-sm"
    >
      <MiniBlobs palette={category === "bug" ? 0 : category === "complaint" ? 2 : 3} />
      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            Help us improve
          </p>
          <h2 className="text-3xl font-black tracking-tight">
            Spotted a bug? Something annoying?
          </h2>
          <p className="text-muted-foreground font-medium">
            Tell us what broke or what you&apos;d change — every report lands directly in the
            team&apos;s inbox and shapes the next update.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-lg">Feedback received</p>
              <p className="text-sm text-muted-foreground font-medium">
                We read every single report. Keep them coming!
              </p>
            </div>
            <Button variant="outline" onClick={() => setSent(false)} className="rounded-xl">
              Send another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "bug", label: "Report a Bug", icon: Bug },
                  { key: "complaint", label: "Complaint", icon: Zap },
                  { key: "idea", label: "Improvement Idea", icon: Lightbulb },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={
                    category === key
                      ? "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-primary bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest transition-all"
                      : "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-all"
                  }
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short title — e.g. 'Videos won't play on Safari'"
              maxLength={120}
              className="h-14 rounded-2xl border-border bg-secondary/50 font-medium"
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              rows={5}
              required
              placeholder={
                category === "bug"
                  ? "What happened? What did you expect instead? Which device/browser?"
                  : category === "complaint"
                    ? "What's frustrating you? Be honest — we can take it."
                    : "What would make Edyfra better for you?"
              }
              className="w-full p-5 rounded-2xl border border-border bg-secondary/50 font-medium text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
            />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground font-bold">{message.length}/4000</p>
              <Button
                type="submit"
                disabled={sending || !message.trim()}
                className="rounded-xl bg-primary text-primary-foreground font-black text-[10px] tracking-widest uppercase px-8 h-12 active:scale-95"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send to the Team
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </motion.section>
  );
}
