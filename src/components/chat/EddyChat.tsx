"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  Bug,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { handleEddyQuery } from "@/app/actions/eddy";
import { submitFeedback } from "@/app/actions/feedback";
import { useRegisterOverlay } from "@/lib/overlay-manager";
import { Z } from "@/lib/layers";

type EddyMessage = {
  id: string;
  role: "user" | "eddy";
  content: string;
};

const WELCOME: EddyMessage = {
  id: "welcome",
  role: "eddy",
  content:
    "Hey there! \u{1F44B} I'm Eddy, your Edyfra guide. Ask me anything about the platform \u2014 finding a tutor, earning XP, navigating the dashboard, or anything else!",
};

export default function EddyChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<EddyMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  // Feedback mode
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    // Scroll to bottom whenever messages change or a new token arrives.
    // Uses the ref first (reliable), falls back to the messagesEnd sentinel.
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMsg: EddyMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await handleEddyQuery(text, pathname);
      setMessages((prev) => [
        ...prev,
        { id: `eddy-${Date.now()}`, role: "eddy", content: response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `eddy-${Date.now()}`,
          role: "eddy",
          content: "Sorry, I hit a snag! Could you try asking again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME]);
  };

  const handleSendFeedback = async () => {
    const text = feedbackText.trim();
    if (!text || feedbackSending) return;

    setFeedbackSending(true);
    try {
      const res = await submitFeedback({
        category: "bug",
        message: text,
        context: pathname || undefined,
      });
      if (!res.error) {
        setFeedbackSent(true);
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackText("");
          setFeedbackSent(false);
        }, 2500);
      }
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleOpenFeedback = () => {
    setShowFeedback(true);
    setFeedbackText("");
    setFeedbackSent(false);
  };

  // Register overlays unconditionally before any early return so hook order
  // is deterministic across all renders.
  useRegisterOverlay(
    { id: "eddy-chat-closed", edge: "bottom-right", slot: "eddy-chat", size: isOpen ? 0 : 56 + 24 },
    [isOpen],
  );
  useRegisterOverlay(
    { id: "eddy-chat-open", edge: "bottom-right", slot: "eddy-chat", size: isOpen ? 380 + 24 : 0 },
    [isOpen],
  );

  if (pathname?.startsWith("/study-room")) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          zIndex: isOpen ? -1 : Z.FAB,
          bottom: "calc(var(--edyfra-overlay-bottom-edge, 0px) + 24px + env(safe-area-inset-bottom, 0px))",
        }}
        aria-label="Chat with Eddy"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 sm:bg-transparent"
              style={{ zIndex: Z.FLOATING }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed right-6 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl"
              style={{
                zIndex: Z.FAB,
                bottom: "calc(var(--edyfra-overlay-bottom-edge, 0px) + 24px + env(safe-area-inset-bottom, 0px))",
                height: "min(560px, calc(100vh - 80px - var(--edyfra-overlay-bottom-edge, 0px) - env(safe-area-inset-bottom, 0px)))",
              }}
            >
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Eddy</p>
                  <p className="text-xs text-muted-foreground">
                    Site Assistant
                  </p>
                </div>
                <button
                  onClick={handleOpenFeedback}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Report a bug"
                  title="Report a bug"
                >
                  <Bug className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {showFeedback ? (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10">
                        <Bug className="h-5 w-5 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Report a Bug</p>
                        <p className="text-xs text-muted-foreground">
                          Describe what went wrong
                        </p>
                      </div>
                    </div>

                    {feedbackSent ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">Thank you!</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your bug report has been forwarded to the admin.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        maxLength={4000}
                        rows={8}
                        placeholder="What happened? Include steps to reproduce, expected vs actual behavior..."
                        className="w-full rounded-xl border bg-muted/50 px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                      />
                    )}
                  </div>

                  <div className="border-t p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowFeedback(false);
                          setFeedbackText("");
                          setFeedbackSent(false);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border hover:bg-muted transition-colors cursor-pointer"
                        aria-label="Back to chat"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      {!feedbackSent && (
                        <button
                          onClick={handleSendFeedback}
                          disabled={!feedbackText.trim() || feedbackSending}
                          className="flex-1 h-9 rounded-xl bg-rose-500 text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {feedbackSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Send Report
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ScrollArea className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
                    <div
                      ref={(el) => {
                        if (el) {
                          const viewport = el.closest(
                            '[data-slot="scroll-area-viewport"]',
                          ) as HTMLDivElement | null;
                          scrollViewportRef.current = viewport;
                        }
                      }}
                      className="space-y-3"
                    >
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex max-w-[85%] gap-2 ${
                              msg.role === "user" ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.role === "user" ? (
                                <User className="h-3.5 w-3.5" />
                              ) : (
                                <Bot className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex max-w-[85%] gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="rounded-2xl bg-muted px-4 py-3">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="border-t p-3">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        className="flex-1 h-9 rounded-xl border bg-muted/50 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
