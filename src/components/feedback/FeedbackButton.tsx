"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Send, Loader2, CheckCircle2, X, Bug, Lightbulb, Heart, Frown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { submitFeedback, type FeedbackCategory } from "@/app/actions/feedback";

const CATEGORIES: { key: FeedbackCategory; label: string; icon: any; color: string }[] = [
  { key: "bug",         label: "Report a bug",  icon: Bug,         color: "from-rose-500/15 to-red-500/15 border-rose-500/30" },
  { key: "idea",        label: "Suggest idea",  icon: Lightbulb,   color: "from-amber-500/15 to-yellow-500/15 border-amber-500/30" },
  { key: "complaint",   label: "Complaint",     icon: Frown,       color: "from-orange-500/15 to-red-500/15 border-orange-500/30" },
  { key: "compliment",  label: "Compliment",    icon: Heart,       color: "from-pink-500/15 to-rose-500/15 border-pink-500/30" },
  { key: "other",       label: "Something else", icon: HelpCircle, color: "from-cyan-500/15 to-violet-500/15 border-cyan-500/30" },
];

interface FeedbackButtonProps {
  /** Optional context string — e.g. the page the user is on */
  context?: string;
  /** Position variant: "floating" = bottom-right FAB; "inline" = inline button */
  variant?: "floating" | "inline";
  /** Button label override (inline variant only) */
  label?: string;
}

export function FeedbackButton({ context, variant = "floating", label }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [rating, setRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setCategory("idea");
    setRating(0);
    setSubject("");
    setMessage("");
    setSent(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please tell us what's on your mind.");
      return;
    }
    setSending(true);
    try {
      const res = await submitFeedback({
        category,
        rating: rating || undefined,
        subject: subject || undefined,
        message,
        context: context || (typeof window !== "undefined" ? window.location.pathname : undefined),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setSent(true);
        toast.success("Thanks — your feedback reached the team.");
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 1800);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {variant === "floating" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-[0_8px_32px_rgba(6,182,212,0.45)] hover:brightness-110 hover:scale-105 transition-all flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-full h-11 px-5 gap-2 font-bold text-xs uppercase tracking-widest"
        >
          <MessageSquare className="h-4 w-4" />
          {label || "Send Feedback"}
        </Button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
            onClick={() => !sending && setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 60, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />

              {sent ? (
                <div className="relative p-10 text-center space-y-4">
                  <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tightest">Thanks for the feedback!</h3>
                  <p className="text-muted-foreground font-medium">
                    The team reviews every message. We&apos;ll reach out if we need more.
                  </p>
                </div>
              ) : (
                <div className="relative p-6 sm:p-8 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-tightest">How can we improve?</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">
                        Your message goes straight to the Edyfra team.
                      </p>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      disabled={sending}
                      className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center disabled:opacity-50"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Category pills */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      What is it?
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => {
                        const active = category === c.key;
                        const Icon = c.icon;
                        return (
                          <button
                            key={c.key}
                            onClick={() => setCategory(c.key)}
                            disabled={sending}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                              active
                                ? `bg-gradient-to-r ${c.color} text-foreground border-current`
                                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating (optional) */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      How are we doing? <span className="font-medium normal-case tracking-normal opacity-60">(optional)</span>
                    </label>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRating(rating === n ? 0 : n)}
                          disabled={sending}
                          aria-label={`${n} star${n > 1 ? "s" : ""}`}
                          className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          <Star
                            className={`h-7 w-7 ${
                              n <= rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-xs font-bold text-amber-500">
                          {rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Short title <span className="font-medium normal-case tracking-normal opacity-60">(optional)</span>
                    </label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={120}
                      disabled={sending}
                      placeholder="e.g. Search bar freezes when I type fast"
                      className="mt-2 h-11 rounded-xl bg-background"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Tell us more
                    </label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={4000}
                      disabled={sending}
                      rows={5}
                      placeholder="What happened, or what would make Edyfra better for you?"
                      className="mt-2 rounded-xl bg-background resize-none"
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground text-right font-bold">
                      {message.length}/4000
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={sending || !message.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_24px_rgba(6,182,212,0.35)]"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send to team
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
