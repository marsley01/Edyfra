"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  Users,
  Clock,
  Flame,
  UserPlus,
  UserCheck,
  RefreshCw,
  X,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";
import { formatCount } from "@/lib/social-utils";
import { getSubjectsByLevel } from "@/lib/subjects";
import {
  getFeedPage,
  createPost,
  deletePost,
  setPostLike,
  getComments,
  addComment,
  deleteComment,
  type FeedTab,
  type FeedPostDTO,
  type FeedCommentDTO,
  type FeedViewer,
} from "@/app/actions/feed";
import { RelativeTime } from "./relative-time";
import { useFollowing, changeFollow } from "./follow-store";

/* ─── Small shared bits ─────────────────────────────────────────────────── */

export function UserAvatar({
  name,
  avatar,
  className,
}: {
  name: string;
  avatar: string | null | undefined;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10 border border-border", className)}>
      {avatar ? <AvatarImage src={avatar} alt={name} className="object-cover" /> : null}
      <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
        {(name || "?").charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function roleLabel(role: string, level: string | null) {
  if (role === "TUTOR") return "Tutor";
  if (level === "UNIVERSITY") return "University";
  if (level === "HIGH_SCHOOL") return "High school";
  return "Student";
}

export function FollowButton({
  userId,
  initial,
  size = "sm",
  hideWhenFollowing = false,
  className,
}: {
  userId: string;
  initial: boolean;
  size?: "xs" | "sm" | "md";
  /** Post headers only offer "Follow"; once followed it shows briefly then hides. */
  hideWhenFollowing?: boolean;
  className?: string;
}) {
  const { following, pending } = useFollowing(userId, initial);
  const [justFollowed, setJustFollowed] = useState(false);

  if (hideWhenFollowing && following && !justFollowed && !pending) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const want = !following;
    // Keep the button visible (as "Following") for a moment after a follow.
    if (want && hideWhenFollowing) setJustFollowed(true);
    try {
      const final = await changeFollow(userId, want, following);
      if (hideWhenFollowing) setTimeout(() => setJustFollowed(false), final ? 2500 : 0);
    } catch (err) {
      setJustFollowed(false);
      showError({
        title: want ? "We couldn't follow them" : "We couldn't unfollow them",
        cause: err instanceof Error ? err.message : "Something hiccuped on our side.",
        fix: "Try again in a moment.",
      });
    }
  };

  const sizes = {
    xs: "h-7 px-2.5 text-[10px]",
    sm: "h-8 px-3 text-[11px]",
    md: "h-10 px-5 text-xs",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60",
        sizes[size],
        following
          ? "bg-secondary text-foreground border border-border hover:border-destructive/40 hover:text-destructive"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        className,
      )}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

/* ─── Post card ─────────────────────────────────────────────────────────── */

const CLAMP_AT = 320;

export function PostCard({
  post,
  viewer,
  onDeleted,
  onTopic,
  defaultCommentsOpen = false,
}: {
  post: FeedPostDTO & { pending?: boolean };
  viewer: FeedViewer | null;
  onDeleted?: (id: string) => void;
  onTopic?: (subject: string) => void;
  defaultCommentsOpen?: boolean;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [burst, setBurst] = useState(false);
  // The last state the user asked for; stale responses are ignored.
  const desiredLike = useRef(post.likedByMe);
  const likeSeq = useRef(0);

  const isPending = !!post.pending;
  const long = post.content.length > CLAMP_AT;

  const toggleLike = async () => {
    if (!viewer) {
      showError({ title: "Sign in to like posts", cause: "Likes are for Edyfra members.", fix: "Sign in and try again." });
      return;
    }
    if (isPending) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    const want = !liked;
    desiredLike.current = want;
    const seq = ++likeSeq.current;
    setLiked(want);
    setLikeCount((c) => Math.max(0, c + (want ? 1 : -1)));
    if (want) {
      setBurst(true);
      setTimeout(() => setBurst(false), 350);
    }
    try {
      const res = await setPostLike(post.id, want);
      if (seq !== likeSeq.current) return; // a newer tap is in flight
      if (!res.ok) throw new Error(res.error);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      if (seq !== likeSeq.current) return;
      desiredLike.current = prevLiked;
      setLiked(prevLiked);
      setLikeCount(prevCount);
      showError({
        title: "We couldn't save that like",
        cause: err instanceof Error ? err.message : "A hiccup on our side.",
        fix: "Tap the heart again in a moment.",
      });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/profile/${post.author.id}?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.author.name} on Edyfra`, text: post.content.slice(0, 140), url });
      } else {
        await navigator.clipboard.writeText(url);
        showSuccess("Link copied", { description: "Paste it anywhere to share this post." });
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        showError({ title: "Couldn't share this post", cause: "Your browser blocked sharing.", fix: "Try again." });
      }
    }
  };

  const remove = async () => {
    setDeleting(true);
    const res = await deletePost(post.id).catch(() => ({ ok: false, error: "Network hiccup." }));
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) {
      showError({ title: "We couldn't delete that post", cause: res.error, fix: "Try again in a moment." });
      return;
    }
    onDeleted?.(post.id);
  };

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        isPending && "opacity-70",
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <header className="flex items-start gap-3">
          <Link href={`/profile/${post.author.id}`} className="shrink-0">
            <UserAvatar name={post.author.name} avatar={post.author.avatar} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
              <Link
                href={`/profile/${post.author.id}`}
                className="font-black text-sm tracking-tight hover:text-primary transition-colors truncate max-w-[60%]"
              >
                {post.author.name}
              </Link>
              {post.author.role === "TUTOR" && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                  Tutor
                </span>
              )}
              <span className="text-muted-foreground/50 text-xs">·</span>
              {isPending ? (
                <span className="text-[11px] font-bold text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Posting
                </span>
              ) : (
                <RelativeTime iso={post.createdAt} className="text-[11px] font-bold text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-semibold">
              <span>{roleLabel(post.author.role, post.author.educationLevel)}</span>
              {post.author.username && <span className="truncate">@{post.author.username}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {viewer && !post.isMine && (
              <FollowButton userId={post.author.id} initial={post.authorFollowed} size="xs" hideWhenFollowing />
            )}
            {post.isMine && !isPending && (
              <button
                type="button"
                onClick={() => setConfirmDelete((v) => !v)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {confirmDelete && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs font-semibold">Delete this post for everyone?</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={deleting} onClick={remove}>
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="mt-3">
          <p
            className={cn(
              "text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words",
              long && !expanded && "line-clamp-6",
            )}
          >
            {post.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-bold text-primary hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
          {post.subject && (
            <button
              type="button"
              onClick={() => onTopic?.(post.subject!)}
              disabled={!onTopic}
              className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold enabled:hover:bg-primary/15"
            >
              <Hash className="h-3 w-3" />
              {post.subject}
            </button>
          )}
          {post.image && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt="" loading="lazy" className="w-full max-h-[480px] object-cover" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 pt-2 border-t border-border/60 flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLike}
            disabled={isPending}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50",
              liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5",
            )}
          >
            <Heart className={cn("h-4 w-4 transition-transform", liked && "fill-rose-500", burst && "scale-125")} />
            <span className="tabular-nums">{formatCount(likeCount)}</span>
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            disabled={isPending}
            aria-expanded={commentsOpen}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50",
              commentsOpen ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/5",
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{formatCount(commentCount)}</span>
          </button>
          <button
            type="button"
            onClick={share}
            disabled={isPending}
            aria-label="Share post"
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {commentsOpen && !isPending && (
          <CommentThread
            postId={post.id}
            viewer={viewer}
            onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
          />
        )}
      </div>
    </article>
  );
}

/* ─── Comments ──────────────────────────────────────────────────────────── */

type UiComment = FeedCommentDTO & { pending?: boolean };

function CommentThread({
  postId,
  viewer,
  onCountChange,
}: {
  postId: string;
  viewer: FeedViewer | null;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<UiComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    if (!viewer) {
      setLoading(false);
      return;
    }
    getComments(postId)
      .then((res) => {
        if (!alive) return;
        setComments(res.comments);
        setCursor(res.nextCursor);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Keyed on the id, not the object: SocialFeed gets a fresh viewer object
    // with every page, and refetching here would wipe earlier/pending comments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, viewer?.id]);

  const loadEarlier = async () => {
    if (!cursor) return;
    setLoadingEarlier(true);
    const res = await getComments(postId, cursor).catch(() => null);
    setLoadingEarlier(false);
    if (!res) return;
    setComments((prev) => {
      const seen = new Set(prev.map((c) => c.id));
      return [...res.comments.filter((c) => !seen.has(c.id)), ...prev];
    });
    setCursor(res.nextCursor);
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || !viewer) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: UiComment = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      isMine: true,
      canDelete: false,
      pending: true,
      author: { id: viewer.id, name: viewer.name, avatar: viewer.avatar, role: viewer.role },
    };
    setComments((prev) => [...prev, optimistic]);
    setText("");
    onCountChange(1);
    const res = await addComment(postId, content).catch(() => ({ ok: false as const, error: "Network hiccup." }));
    if (!res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setText(content);
      onCountChange(-1);
      showError({ title: "We couldn't post your comment", cause: res.error, fix: "Your text is still in the box — try again." });
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === tempId ? res.comment : c)));
  };

  const remove = async (c: UiComment) => {
    const snapshot = comments;
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    onCountChange(-1);
    const res = await deleteComment(c.id).catch(() => ({ ok: false, error: "Network hiccup." }));
    if (!res.ok) {
      setComments(snapshot);
      onCountChange(1);
      showError({ title: "We couldn't delete that comment", cause: res.error, fix: "Try again in a moment." });
    }
  };

  if (!viewer) {
    return (
      <div className="mt-3 rounded-xl bg-secondary/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to read and join the conversation.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {cursor && (
        <button
          type="button"
          onClick={loadEarlier}
          disabled={loadingEarlier}
          className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {loadingEarlier && <Loader2 className="h-3 w-3 animate-spin" />} View earlier comments
        </button>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground font-medium">No comments yet — start the conversation.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className={cn("flex gap-2 group", c.pending && "opacity-60")}>
              <Link href={`/profile/${c.author.id}`} className="shrink-0">
                <UserAvatar name={c.author.name} avatar={c.author.avatar} className="h-7 w-7" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="rounded-xl bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/profile/${c.author.id}`} className="text-xs font-black hover:text-primary truncate">
                      {c.author.name}
                    </Link>
                    {c.author.role === "TUTOR" && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Tutor
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-snug text-foreground/90 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
                <div className="flex items-center gap-3 px-1 mt-0.5 text-[10px] font-bold text-muted-foreground">
                  {c.pending ? <span>Sending…</span> : <RelativeTime iso={c.createdAt} />}
                  {c.canDelete && !c.pending && (
                    <button type="button" onClick={() => remove(c)} className="hover:text-destructive">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <UserAvatar name={viewer.name} avatar={viewer.avatar} className="h-7 w-7" />
        <div className="flex-1 flex items-end gap-1 rounded-xl border border-border bg-background px-3 py-1.5 focus-within:border-primary/40">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a comment…"
            className="flex-1 resize-none bg-transparent text-[13px] outline-none py-1 max-h-28 placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-primary disabled:opacity-30 hover:bg-primary/10"
            aria-label="Send comment"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Composer ──────────────────────────────────────────────────────────── */

const MAX_POST = 2000;

function Composer({
  viewer,
  topic,
  onOptimistic,
  onSettled,
}: {
  viewer: FeedViewer;
  topic: string | null;
  onOptimistic: (post: FeedPostDTO & { pending: true }) => void;
  onSettled: (tempId: string, result: FeedPostDTO | null) => void;
}) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState<string>(topic ?? "");
  const [focused, setFocused] = useState(false);
  const subjects = useMemo(() => getSubjectsByLevel(viewer.educationLevel ?? undefined), [viewer.educationLevel]);

  useEffect(() => {
    setSubject(topic ?? "");
  }, [topic]);

  const submit = async () => {
    const content = text.trim();
    if (!content) return;
    const tempId = `temp-${Date.now()}`;
    onOptimistic({
      id: tempId,
      content,
      image: null,
      subject: subject || null,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      isMine: true,
      authorFollowed: false,
      pending: true,
      author: {
        id: viewer.id,
        name: viewer.name,
        avatar: viewer.avatar,
        role: viewer.role,
        educationLevel: viewer.educationLevel,
        username: null,
      },
    });
    setText("");
    const res = await createPost({ content, subject: subject || null }).catch(() => ({
      ok: false as const,
      error: "Network hiccup.",
    }));
    if (!res.ok) {
      onSettled(tempId, null);
      setText(content);
      showError({ title: "We couldn't share that post", cause: res.error, fix: "Your text is still in the box — try again." });
      return;
    }
    onSettled(tempId, res.post);
  };

  const remaining = MAX_POST - text.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <UserAvatar name={viewer.name} avatar={viewer.avatar} />
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_POST))}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={focused || text ? 3 : 2}
            placeholder={`What are you studying, ${viewer.name.split(" ")[0]}? Ask a question or share a win…`}
            className="w-full resize-none bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/60 pt-2"
          />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <label className="sr-only" htmlFor="composer-subject">
              Subject
            </label>
            <select
              id="composer-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 max-w-[11rem] rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground"
            >
              <option value="">No subject</option>
              {topic && !subjects.includes(topic) && <option value={topic}>{topic}</option>}
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span
              className={cn(
                "ml-auto text-[11px] font-bold tabular-nums",
                remaining < 100 ? "text-destructive" : "text-muted-foreground/60",
              )}
            >
              {text ? remaining : ""}
            </span>
            <Button
              onClick={submit}
              disabled={!text.trim()}
              className="h-9 rounded-lg px-5 font-black text-[11px] uppercase tracking-widest"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feed ──────────────────────────────────────────────────────────────── */

const TABS: Array<{ id: FeedTab; label: string; icon: typeof Sparkles }> = [
  { id: "for-you", label: "For you", icon: Sparkles },
  { id: "following", label: "Following", icon: Users },
  { id: "latest", label: "Latest", icon: Clock },
  { id: "popular", label: "Popular", icon: Flame },
];

type UiPost = FeedPostDTO & { pending?: boolean };
type TabState = { posts: UiPost[]; cursor: string | null; done: boolean; loaded: boolean; error: boolean };
const EMPTY_TAB: TabState = { posts: [], cursor: null, done: false, loaded: false, error: false };

export function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3.5 w-2/5" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

/**
 * The social feed. Each tab keeps its own loaded pages so switching back is
 * instant; new pages stream in via IntersectionObserver; every mutation is
 * applied locally (no full-list refetch).
 */
export function SocialFeed({
  topic = null,
  onTopicChange,
  initialTab = "for-you",
}: {
  topic?: string | null;
  onTopicChange?: (topic: string | null) => void;
  initialTab?: FeedTab;
}) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [tabs, setTabs] = useState<Record<string, TabState>>({});
  const [viewer, setViewer] = useState<FeedViewer | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const key = `${tab}|${topic ?? ""}`;
  const current = tabs[key] ?? EMPTY_TAB;
  const inflight = useRef<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (k: string, cursor: string | null) => {
      const reqKey = `${k}#${cursor ?? ""}`;
      if (inflight.current === reqKey) return;
      inflight.current = reqKey;
      const [t, tp] = k.split("|");
      if (cursor) setLoadingMore(true);
      try {
        const page = await getFeedPage({ tab: t as FeedTab, topic: tp || null, cursor });
        setViewer((prev) => (prev && page.viewer && prev.id === page.viewer.id ? prev : page.viewer));
        if (page.error) {
          // Keep the existing cursor so Retry / Load more resumes where it was.
          setTabs((prev) => ({ ...prev, [k]: { ...(prev[k] ?? EMPTY_TAB), loaded: true, error: true } }));
          return;
        }
        setTabs((prev) => {
          const old = prev[k] ?? EMPTY_TAB;
          const base = cursor ? old.posts : old.posts.filter((p) => p.pending);
          const seen = new Set(base.map((p) => p.id));
          return {
            ...prev,
            [k]: {
              posts: [...base, ...page.posts.filter((p) => !seen.has(p.id))],
              cursor: page.nextCursor,
              done: !page.nextCursor,
              loaded: true,
              error: false,
            },
          };
        });
      } catch {
        setTabs((prev) => ({ ...prev, [k]: { ...(prev[k] ?? EMPTY_TAB), loaded: true, error: true } }));
      } finally {
        if (inflight.current === reqKey) inflight.current = null;
        setLoadingMore(false);
      }
    },
    [],
  );

  // First page per tab/topic, once.
  useEffect(() => {
    if (!tabs[key]?.loaded) load(key, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !current.loaded || current.done || current.error) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && current.cursor) load(key, current.cursor);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [key, current.loaded, current.done, current.error, current.cursor, load]);

  const patchAll = (fn: (posts: UiPost[], k: string) => UiPost[]) =>
    setTabs((prev) => {
      const next: Record<string, TabState> = {};
      for (const [k, v] of Object.entries(prev)) next[k] = { ...v, posts: fn(v.posts, k) };
      return next;
    });

  const onOptimistic = (post: UiPost) =>
    setTabs((prev) => {
      const next = { ...prev };
      // A new post belongs at the top of every tab you might look at next.
      for (const t of ["for-you", "following", "latest"]) {
        const k = `${t}|${topic ?? ""}`;
        const st = next[k] ?? EMPTY_TAB;
        next[k] = { ...st, posts: [post, ...st.posts] };
      }
      return next;
    });

  const onSettled = (tempId: string, result: FeedPostDTO | null) =>
    patchAll((posts) =>
      result ? posts.map((p) => (p.id === tempId ? result : p)) : posts.filter((p) => p.id !== tempId),
    );

  const onDeleted = (id: string) => patchAll((posts) => posts.filter((p) => p.id !== id));

  const retry = () => load(key, current.cursor);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Feed"
        className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="flex gap-1 rounded-xl bg-secondary p-1 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-black whitespace-nowrap transition-all",
                tab === id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {topic && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
              <Hash className="h-3 w-3" /> {topic}
            </span>
            {onTopicChange && (
              <button
                type="button"
                onClick={() => onTopicChange(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {viewer && <Composer viewer={viewer} topic={topic} onOptimistic={onOptimistic} onSettled={onSettled} />}

      {!current.loaded ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : viewer === null ? (
        <EmptyFeed
          title="Sign in to see the community"
          body="The feed is for Edyfra students and tutors."
          action={
            <Link href="/login">
              <Button className="rounded-lg">Sign in</Button>
            </Link>
          }
        />
      ) : current.posts.length === 0 && current.error ? (
        <EmptyFeed
          title="We couldn't load the feed"
          body="Check your connection and try again."
          action={
            <Button onClick={retry} variant="outline" className="rounded-lg">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      ) : current.posts.length === 0 ? (
        <EmptyFeed
          title={
            tab === "following"
              ? "Nobody you follow has posted yet"
              : topic
                ? `No posts about ${topic} yet`
                : "The feed is quiet"
          }
          body={
            tab === "following"
              ? "Follow classmates and tutors from their posts or profiles and their updates land here."
              : "Be the first to share something — a question, a tip, or a win."
          }
          action={
            tab === "following" ? (
              <Button variant="outline" className="rounded-lg" onClick={() => setTab("latest")}>
                Browse latest posts
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {current.posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              viewer={viewer ?? null}
              onDeleted={onDeleted}
              onTopic={onTopicChange ? (s) => onTopicChange(s) : undefined}
            />
          ))}
        </div>
      )}

      <div ref={sentinel} aria-hidden className="h-1" />
      {loadingMore && <PostSkeleton />}
      {current.loaded && current.error && current.posts.length > 0 && (
        <div className="text-center">
          <Button onClick={retry} variant="outline" size="sm" className="rounded-lg">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Load more
          </Button>
        </div>
      )}
      {current.loaded && current.done && current.posts.length > 0 && (
        <p className="py-6 text-center text-xs font-bold text-muted-foreground">You&apos;re all caught up.</p>
      )}
    </div>
  );
}

function EmptyFeed({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 px-6 py-14 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
