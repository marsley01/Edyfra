"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Star,
  Send,
  Loader2,
  CheckCircle2,
  X,
  Bug,
  Lightbulb,
  Heart,
  Frown,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { submitFeedback, type FeedbackCategory } from "@/app/actions/feedback";
import { zVar } from "@/lib/layers";
import { useRegisterOverlay } from "@/lib/overlay-manager";

const CATEGORIES: { key: FeedbackCategory; label: string; color: string; Icon: typeof Bug }[] = [
  { key: "bug",        label: "Report a bug",  color: "from-rose-500/15 to-red-500/15 border-rose-500/30",       Icon: Bug },
  { key: "idea",       label: "Suggest idea",  color: "from-amber-500/15 to-yellow-500/15 border-amber-500/30",   Icon: Lightbulb },
  { key: "complaint",  label: "Complaint",     color: "from-orange-500/15 to-red-500/15 border-orange-500/30",   Icon: Frown },
  { key: "compliment", label: "Compliment",    color: "from-pink-500/15 to-rose-500/15 border-pink-500/30",       Icon: Heart },
  { key: "other",      label: "Something else", color: "from-cyan-500/15 to-violet-500/15 border-cyan-500/30",    Icon: HelpCircle },
];

interface FeedbackState {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const noop = () => undefined;
const DEFAULT_STATE: FeedbackState = { open: false, openModal: noop, closeModal: noop };

let externalState: FeedbackState = DEFAULT_STATE;
const stateListeners = new Set<(s: FeedbackState) => void>();

function setExternalState(next: FeedbackState) {
  externalState = next;
  stateListeners.forEach((l) => l(next));
}

function useExternalFeedback(): FeedbackState {
  const [state, setState] = useState<FeedbackState>(externalState);
  useEffect(() => {
    const listener = (s: FeedbackState) => setState(s);
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }, []);
  return state;
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Public API: a tiny store that any button (in the dock, in a sidebar, in a
 *  page) can call to open the global feedback modal.
 * ──────────────────────────────────────────────────────────────────────────── */

export function openFeedback() {
  setExternalState({
    open: true,
    openModal: () => setExternalState({ ...externalState, open: true }),
    closeModal: () => setExternalState({ ...externalState, open: false }),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 *  BottomDock — the bottom bar + the feedback modal.
 *  Renders once at the root of the app.
 * ──────────────────────────────────────────────────────────────────────────── */

const DOCK_HEIGHT_PX = 56;

export function BottomDock() {
  return (
    <>
      <DockBar />
      <FeedbackModal />
    </>
  );
}

function DockBar() {
  useRegisterOverlay(
    { id: "bottom-dock", edge: "bottom", size: DOCK_HEIGHT_PX + 16, slot: "feedback" },
    [],
  );

  return (
    <div
      className="fixed inset-x-0 bottom-0"
      style={{ zIndex: zVar("STICKY") }}
    >
      <div
        className="mx-auto flex items-center justify-between gap-3 sm:gap-4 border-t border-border bg-card/85 backdrop-blur-xl px-3 sm:px-6 shadow-[0_-8px_32px_rgba(0,0,0,0.18)]"
        style={{
          minHeight: DOCK_HEIGHT_PX,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 group shrink-0"
          aria-label="Edyfra Home"
        >
          <span className="relative h-7 w-7 inline-flex items-center justify-center rounded-lg overflow-hidden ring-1 ring-border shadow">
            <Image
              src="/image.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-cover"
            />
          </span>
          <span className="hidden sm:inline text-sm font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
            Edyfra
          </span>
        </Link>

        <nav
          aria-label="Footer"
          className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground min-w-0 overflow-hidden"
        >
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors hidden sm:inline"
          >
            Privacy
          </Link>
          <span aria-hidden className="hidden sm:inline opacity-30">·</span>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors hidden sm:inline"
          >
            Terms
          </Link>
          <span aria-hidden className="hidden md:inline opacity-30">·</span>
          <Link
            href="/institution"
            className="hover:text-foreground transition-colors hidden md:inline"
          >
            Institutions
          </Link>
          <span aria-hidden className="hidden md:inline opacity-30">·</span>
          <span className="opacity-60 hidden md:inline whitespace-nowrap">
            © {new Date().getFullYear()}
          </span>
        </nav>

        <button
          type="button"
          onClick={openFeedback}
          className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-95 transition-all shrink-0"
          aria-label="Send feedback"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Feedback</span>
        </button>
      </div>
    </div>
  );
}

function FeedbackModal() {
  const { open, closeModal } = useExternalFeedback();
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [rating, setRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, sending, closeModal]);

  const reset = () => {
    setCategory("idea");
    setRating(0);
    setSubject("");
    setMessage("");
    setSent(false);
  };

  const handleClose = () => {
    if (sending) return;
    closeModal();
    setTimeout(reset, 250);
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
        context:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setSent(true);
        toast.success("Thanks — your feedback reached the team.");
        setTimeout(handleClose, 1800);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
          style={{ zIndex: zVar("MODAL") }}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
        >
          <motion.div
            initial={{ y: 60, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                    onClick={handleClose}
                    disabled={sending}
                    className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    What is it?
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const active = category === c.key;
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
                          <c.Icon className="h-3.5 w-3.5" />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                      <span className="ml-2 text-xs font-bold text-amber-500">{rating}/5</span>
                    )}
                  </div>
                </div>

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
    </AnimatePresence>,
    document.body,
  );
}
