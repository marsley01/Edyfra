"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Star,
  Search,
  CheckCircle2,
  Archive,
  Trash2,
  Loader2,
  Bug,
  Lightbulb,
  Heart,
  Frown,
  HelpCircle,
  Send,
  Sparkles,
  X,
  Mail,
  MailOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/lib/toast";
import {
  getAllFeedback,
  updateFeedbackStatus,
  setFeedbackAdminNote,
  deleteFeedback,
  type FeedbackCategory,
} from "@/app/actions/feedback";

const CATEGORY_ICON: Record<string, any> = {
  bug: Bug,
  idea: Lightbulb,
  compliment: Heart,
  complaint: Frown,
  other: HelpCircle,
};

const CATEGORY_COLOR: Record<string, string> = {
  bug: "from-rose-500/15 to-red-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300",
  idea: "from-amber-500/15 to-yellow-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300",
  compliment: "from-pink-500/15 to-rose-500/15 border-pink-500/30 text-pink-600 dark:text-pink-300",
  complaint: "from-orange-500/15 to-red-500/15 border-orange-500/30 text-orange-600 dark:text-orange-300",
  other: "from-cyan-500/15 to-violet-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-300",
};

const STATUS_TABS = [
  { key: "new",       label: "New" },
  { key: "read",      label: "Read" },
  { key: "archived",  label: "Archived" },
  { key: "all",       label: "All" },
] as const;

type AnyFeedback = {
  id: string;
  category: string;
  rating: number | null;
  subject: string | null;
  message: string;
  context: string | null;
  status: string;
  adminNote: string | null;
  createdAt: any;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
  } | null;
};

export default function AdminFeedbackInboxPage() {
  const [items, setItems] = useState<AnyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "read" | "archived" | "all">("new");
  const [cat, setCat] = useState<FeedbackCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnyFeedback | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllFeedback({ status: tab, category: cat });
      setItems((data as AnyFeedback[]) || []);
    } catch (err) {
      showError({
        title: "We couldn't load feedback",
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
  }, [tab, cat]);

  useEffect(() => {
    if (selected) setAdminNote(selected.adminNote || "");
  }, [selected]);

  const counts = {
    new:      items.filter((i) => i.status === "new").length,
    read:     items.filter((i) => i.status === "read").length,
    archived: items.filter((i) => i.status === "archived").length,
  };

  const filtered = search.trim()
    ? items.filter((i) => {
        const q = search.toLowerCase();
        return (
          i.message.toLowerCase().includes(q) ||
          (i.subject || "").toLowerCase().includes(q) ||
          (i.user?.name || "").toLowerCase().includes(q) ||
          (i.user?.email || "").toLowerCase().includes(q)
        );
      })
    : items;

  const handleStatus = (id: string, status: "new" | "read" | "archived") => {
    startTransition(async () => {
      const res = await updateFeedbackStatus(id, status);
      if (res.error) {
        showError({
          title: "We couldn't update that status",
          cause: res.error,
          fix: "Try again, or refresh the page.",
        });
      } else {
        showSuccess(`Marked as ${status}`, { description: "The status is updated in the inbox." });
        await load();
        if (selected?.id === id) {
          setSelected({ ...selected, status });
        }
      }
    });
  };

  const handleSaveNote = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await setFeedbackAdminNote(selected.id, adminNote);
      if (res.error) {
        showError({
          title: "We couldn't save that note",
          cause: res.error,
          fix: "Try again, or refresh the page.",
        });
      } else {
        showSuccess("Note saved", { description: "Your note is now attached to that feedback." });
        await load();
        setSelected({ ...selected, adminNote });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this feedback permanently?")) return;
    startTransition(async () => {
      const res = await deleteFeedback(id);
      if (res.error) {
        showError({
          title: "We couldn't delete that feedback",
          cause: res.error,
          fix: "Try again, or refresh the page.",
        });
      } else {
        showSuccess("Deleted", { description: "That feedback is gone from the inbox." });
        if (selected?.id === id) setSelected(null);
        await load();
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              <Inbox className="h-3 w-3" />
              User Feedback
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tightest">What the community is saying.</h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Every message sent from the in-app feedback widget lands here. Read, archive, or follow up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stat label="New"      value={counts.new}      color="from-cyan-500 to-blue-500" />
            <Stat label="Read"     value={counts.read}     color="from-emerald-500 to-teal-500" />
            <Stat label="Archived" value={counts.archived} color="from-zinc-400 to-zinc-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-[10px] font-black uppercase tracking-widest">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  tab === t.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages, names, emails…"
              className="h-11 pl-11 rounded-full bg-card border-border"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["all", "bug", "idea", "complaint", "compliment", "other"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as any)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                cat === c
                  ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/50"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/30 border-2 border-dashed border-border rounded-[2.5rem] text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            {tab === "new" ? "Inbox zero — no new feedback." : "No feedback in this view."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((f) => {
            const Icon = CATEGORY_ICON[f.category] || HelpCircle;
            const isUnread = f.status === "new";
            return (
              <button
                key={f.id}
                onClick={() => {
                  setSelected(f);
                  if (isUnread) handleStatus(f.id, "read");
                }}
                className={`group text-left rounded-2xl border transition-all p-5 hover:border-primary/50 ${
                  isUnread
                    ? "bg-card border-border shadow-sm"
                    : "bg-card/60 border-border/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br border ${CATEGORY_COLOR[f.category]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUnread && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                      )}
                      <span className="text-sm font-black text-foreground truncate">
                        {f.subject || f.message.slice(0, 60) + (f.message.length > 60 ? "…" : "")}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {f.category}
                      </span>
                      {f.rating && (
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {Array.from({ length: f.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 font-medium">
                      {f.message}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{f.user?.name || "Anonymous"}</span>
                      <span>·</span>
                      <span>{f.user?.role}</span>
                      <span>·</span>
                      <span>{new Date(f.createdAt).toLocaleString()}</span>
                      {f.adminNote && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-500">📝 Noted</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isUnread ? (
                    <Mail className="h-5 w-5 text-cyan-500 shrink-0" />
                  ) : (
                    <MailOpen className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
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
              className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between p-6 border-b border-border bg-card/95 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = CATEGORY_ICON[selected.category] || HelpCircle;
                    return (
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br border ${CATEGORY_COLOR[selected.category]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      {selected.subject || "Feedback message"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      {selected.category} · {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* User info */}
                <div className="rounded-2xl bg-secondary/40 border border-border p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
                    {(selected.user?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{selected.user?.name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selected.user?.email} · {selected.user?.role}
                    </p>
                  </div>
                  {selected.rating && (
                    <div className="inline-flex items-center gap-0.5">
                      {Array.from({ length: selected.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Message
                  </label>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selected.message}
                  </p>
                </div>

                {/* Context */}
                {selected.context && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Submitted from
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      {selected.context}
                    </p>
                  </div>
                )}

                {/* Admin note */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Internal note <span className="font-medium normal-case tracking-normal opacity-60">(only admins see this)</span>
                  </label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    placeholder="e.g. Spoke to user on 2026-06-04, will fix in next sprint."
                    className="mt-2 rounded-xl bg-background resize-none"
                  />
                  <Button
                    onClick={handleSaveNote}
                    disabled={isPending}
                    size="sm"
                    className="mt-2 rounded-full"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Save note
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                  {selected.status !== "new" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatus(selected.id, "new")}
                      disabled={isPending}
                      className="rounded-full"
                    >
                      Mark new
                    </Button>
                  )}
                  {selected.status !== "archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatus(selected.id, "archived")}
                      disabled={isPending}
                      className="rounded-full"
                    >
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatus(selected.id, "read")}
                    disabled={isPending || selected.status === "read"}
                    className="rounded-full"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selected.id)}
                    disabled={isPending}
                    className="rounded-full text-rose-500 border-rose-500/30 hover:bg-rose-500/10 ml-auto"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
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
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-4 min-w-[100px] text-white shadow-lg`}>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">{label}</div>
    </div>
  );
}
