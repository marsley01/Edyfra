"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Loader2,
  Search,
  MessageSquare,
  X,
  ArrowLeft,
  User as UserIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";
import { getAllAiConversations, getAiConversationThread } from "@/app/actions/feedback";

type ConvoSummary = {
  userId: string;
  bot: "eddy" | "mash";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
  } | null;
  messageCount: number;
  lastMessageAt: any;
  lastMessage: string;
};

type ThreadMessage = {
  id: string;
  bot: string;
  role: string;
  content: string;
  metadata: any;
  createdAt: any;
  user: any;
};

export default function AdminAiHistoryPage() {
  const [items, setItems] = useState<ConvoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [botFilter, setBotFilter] = useState<"all" | "eddy" | "mash">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ userId: string; bot: "eddy" | "mash" } | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllAiConversations({ bot: botFilter });
      setItems((data as ConvoSummary[]) || []);
    } catch (err) {
      showError({
        title: "We couldn't load AI history",
        cause: "A hiccup on our side blocked the load.",
        fix: "Try again, or refresh the page.",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botFilter]);

  useEffect(() => {
    if (!selected) return;
    setThreadLoading(true);
    startTransition(async () => {
      try {
        const data = await getAiConversationThread(selected.userId, selected.bot);
        setThread((data as ThreadMessage[]) || []);
      } catch (err) {
        showError({
          title: "We couldn't load that conversation",
          cause: "A hiccup on our side blocked the load.",
          fix: "Try again, or pick a different thread.",
        });
        setThread([]);
      } finally {
        setThreadLoading(false);
      }
    });
  }, [selected]);

  const filtered = search.trim()
    ? items.filter((i) => {
        const q = search.toLowerCase();
        return (
          (i.user?.name || "").toLowerCase().includes(q) ||
          (i.user?.email || "").toLowerCase().includes(q) ||
          i.lastMessage.toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 blur-[120px]" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
              <Bot className="h-3 w-3" />
              AI Conversations
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tightest">Chat History</h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Review user conversations with the Eddy and Mash bots to ensure quality and spot abuse.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stat label="Eddy threads" value={items.filter((i) => i.bot === "eddy").length} color="from-pink-500 to-rose-500" />
            <Stat label="Mash threads" value={items.filter((i) => i.bot === "mash").length} color="from-cyan-500 to-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-[10px] font-black uppercase tracking-widest">
          {([
            { k: "all",   label: "All" },
            { k: "eddy",  label: "Eddy" },
            { k: "mash",  label: "Mash AI" },
          ] as const).map((b) => (
            <button
              key={b.k}
              onClick={() => setBotFilter(b.k)}
              className={`px-4 py-1.5 rounded-full transition-all ${
                botFilter === b.k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, email, or last message…"
            className="h-11 pl-11 rounded-full bg-card border-border"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/30 border-2 border-dashed border-border rounded-[2.5rem] text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            No AI conversations yet. They&apos;ll appear here as users chat with Eddy or Mash.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const isEddy = c.bot === "eddy";
            return (
              <button
                key={`${c.userId}::${c.bot}`}
                onClick={() => setSelected({ userId: c.userId, bot: c.bot })}
                className="text-left rounded-2xl border border-border bg-card hover:border-primary/50 p-5 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    isEddy ? "from-pink-500 to-rose-500" : "from-cyan-500 to-blue-500"
                  } text-white shadow-lg`}>
                    {isEddy ? <Sparkles className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-foreground truncate">
                        {c.user?.name || "Anonymous"}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isEddy ? "bg-pink-500/10 text-pink-600 dark:text-pink-300" : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                      }`}>
                        {isEddy ? "Eddy" : "Mash"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {c.user?.role}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        · {c.messageCount} msgs
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 font-medium">
                      {c.lastMessage}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Thread drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 60, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 60, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between p-6 border-b border-border bg-card/95 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(null)}
                    className="sm:hidden rounded-full"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    selected.bot === "eddy" ? "from-pink-500 to-rose-500" : "from-cyan-500 to-blue-500"
                  } text-white`}>
                    {selected.bot === "eddy" ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      {items.find((i) => i.userId === selected.userId && i.bot === selected.bot)?.user?.name || "Conversation"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      {selected.bot} · {items.find((i) => i.userId === selected.userId && i.bot === selected.bot)?.messageCount || 0} messages
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="hidden sm:flex h-9 w-9 rounded-full bg-secondary hover:bg-secondary/70 items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : thread.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-12">
                    No messages in this conversation.
                  </p>
                ) : (
                  thread.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br ${
                            selected.bot === "eddy" ? "from-pink-500 to-rose-500" : "from-cyan-500 to-blue-500"
                          } text-white`}>
                            {selected.bot === "eddy" ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${
                            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {new Date(m.createdAt).toLocaleString()}
                            {m.metadata?.subject && ` · ${m.metadata.subject}`}
                          </p>
                        </div>
                        {isUser && (
                          <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-secondary text-foreground">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-4 min-w-[140px] text-white shadow-lg`}>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">{label}</div>
    </div>
  );
}
