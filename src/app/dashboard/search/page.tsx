"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  UserPlus,
  GraduationCap,
  MapPin,
  SearchX,
  RefreshCcw,
  MessageCircle,
  Star,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlobDecor } from "@/components/ui/blob-decor";
import {
  searchPeople,
  suggestStudyBuddies,
  type PersonResult,
  type SuggestedPerson,
} from "@/app/actions/search";
import { connectWithUser } from "@/app/actions/profile";
import { showError, showSuccess } from "@/lib/toast";
import { useDebounced } from "@/hooks/use-debounced";

type RoleFilter = "ALL" | "STUDENT" | "TUTOR";
type LevelFilter = "ALL" | "HIGH_SCHOOL" | "UNIVERSITY";

const QUICK_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [level, setLevel] = useState<LevelFilter>("ALL");
  const [county, setCounty] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);

  const debouncedQuery = useDebounced(query.trim(), 300);
  const debouncedCounty = useDebounced(county.trim(), 400);

  const [results, setResults] = useState<PersonResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Every request gets a sequence number; responses from older requests are
  // dropped so a slow "ma" response can't overwrite the "math" results.
  const seq = useRef(0);

  const filtersActive = role !== "ALL" || level !== "ALL" || !!debouncedCounty || onlineOnly;
  const active = debouncedQuery.length >= 2 || filtersActive;

  const buildInput = useCallback(
    (cursor: string | null) => ({
      query: debouncedQuery,
      role,
      level,
      county: debouncedCounty,
      onlineOnly,
      cursor,
      limit: 20,
    }),
    [debouncedQuery, role, level, debouncedCounty, onlineOnly],
  );

  useEffect(() => {
    if (!active) {
      seq.current++;
      setResults([]);
      setNextCursor(null);
      setTotal(0);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    searchPeople(buildInput(null))
      .then((res) => {
        if (mine !== seq.current) return;
        if (res.error) {
          setError(res.error);
          setResults([]);
        } else {
          setResults(res.items);
          setNextCursor(res.nextCursor);
          setTotal(res.total);
        }
        setHasSearched(true);
      })
      .catch(() => {
        if (mine !== seq.current) return;
        setError("Something went wrong. Please try again.");
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [active, buildInput, retryKey]);

  useEffect(() => {
    let cancelled = false;
    suggestStudyBuddies({ limit: 6 })
      .then((res) => {
        if (!cancelled) setSuggestions(res.items);
      })
      .catch(() => {
        /* suggestions are optional */
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const res = await searchPeople(buildInput(nextCursor));
      if (mine !== seq.current) return;
      if (res.error) {
        showError({ title: "Couldn't load more", cause: res.error, fix: "Try again in a moment." });
        return;
      }
      setResults((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(res.nextCursor);
    } catch {
      showError({ title: "Couldn't load more", cause: "Network hiccup.", fix: "Try again in a moment." });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleConnect = async (person: PersonResult) => {
    setConnectingId(person.id);
    try {
      const res = await connectWithUser(person.id);
      if (res.ok && res.channelId) {
        showSuccess(`Chat with ${person.name.split(" ")[0]} opened`, {
          description: "You're following them too — say hi!",
        });
        router.push(`/dashboard/messages?channel=${res.channelId}`);
      } else {
        if (res.error?.includes("sign in")) router.push("/login");
        showError({ title: "Couldn't connect", cause: res.error, fix: "Try again in a moment." });
      }
    } catch {
      showError({ title: "Couldn't connect", cause: "Network hiccup.", fix: "Try again in a moment." });
    } finally {
      setConnectingId(null);
    }
  };

  const clearFilters = () => {
    setRole("ALL");
    setLevel("ALL");
    setCounty("");
    setOnlineOnly(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative space-y-4 text-center py-8">
        <BlobDecor variant="mixed" />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-black tracking-tighter relative"
        >
          Find Your <span className="text-primary">People</span>
        </motion.h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium relative">
          Search students and tutors by name, @username, subject, school, form or county.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex items-center px-4 md:px-6 py-2">
            <Search className="h-6 w-6 text-muted-foreground shrink-0" />
            <Input
              placeholder="e.g. Jane, @kamau, Physics, Form 3, Kisumu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search people"
              className="border-none focus-visible:ring-0 text-lg h-14 font-medium bg-transparent"
            />
            {loading && <Loader2 className="h-6 w-6 animate-spin text-primary ml-2 shrink-0" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-secondary/60 p-1 rounded-full">
            {(["ALL", "STUDENT", "TUTOR"] as RoleFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  role === r ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "ALL" ? "Everyone" : r === "STUDENT" ? "Students" : "Tutors"}
              </button>
            ))}
          </div>
          <Select value={level} onValueChange={(v) => setLevel((v as LevelFilter) ?? "ALL")}>
            <SelectTrigger className="h-9 w-[150px] rounded-full text-xs font-bold">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All levels</SelectItem>
              <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
              <SelectItem value="UNIVERSITY">University</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County"
            aria-label="Filter by county"
            className="h-9 w-[130px] rounded-full text-xs font-bold"
          />
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            aria-pressed={onlineOnly}
            className={`h-9 px-4 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
              onlineOnly ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            Online now
          </button>
          {filtersActive && (
            <button onClick={clearFilters} className="text-xs font-bold text-muted-foreground hover:text-foreground px-2">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 space-y-4">
              <div className="bg-destructive/10 text-destructive p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <SearchX className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Search failed</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">{error}</p>
              <Button onClick={() => setRetryKey((k) => k + 1)} variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Retry search
              </Button>
            </motion.div>
          ) : loading && results.length === 0 ? (
            <motion.div key="loading" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-6 border border-border rounded-3xl space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </motion.div>
          ) : hasSearched && results.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
              <div className="bg-secondary p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <SearchX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">No one matches that yet</h3>
              <p className="text-muted-foreground">Try a different name, subject or county{filtersActive ? ", or clear the filters" : ""}.</p>
              {filtersActive && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {total} {total === 1 ? "person" : "people"} found
              </p>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
                {results.map((p) => (
                  <PersonCard key={p.id} person={p} connecting={connectingId === p.id} onConnect={handleConnect} />
                ))}
              </div>
              {nextCursor && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="rounded-xl font-bold min-w-[160px]">
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {QUICK_SUBJECTS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="p-5 bg-secondary/50 border border-border rounded-3xl text-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all space-y-3"
                  >
                    <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center mx-auto text-primary">
                      <Search className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{tag}</p>
                  </button>
                ))}
              </div>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-black tracking-tight">Suggested study buddies</h2>
                </div>
                {suggestionsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-40 rounded-3xl" />
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add subjects to your profile and we&apos;ll suggest students who study the same things.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {suggestions.map((p) => (
                      <PersonCard
                        key={p.id}
                        person={p}
                        sharedSubjects={p.sharedSubjects}
                        connecting={connectingId === p.id}
                        onConnect={handleConnect}
                      />
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  connecting,
  onConnect,
  sharedSubjects,
}: {
  person: PersonResult;
  connecting: boolean;
  onConnect: (p: PersonResult) => void;
  sharedSubjects?: string[];
}) {
  const isTutor = person.role === "TUTOR";
  const shared = new Set((sharedSubjects ?? []).map((s) => s.toLowerCase()));
  const subjects = person.subjects.slice(0, 3);
  const where = [person.form ?? person.level, person.school].filter(Boolean).join(" · ");

  return (
    <Card className="border-border hover:border-primary/50 transition-all group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            <div className="relative shrink-0">
              <Image
                src={person.avatar_url || "/default-avatar.png"}
                alt={person.name}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-2xl bg-secondary object-cover ring-1 ring-border group-hover:ring-primary/30 transition-all"
              />
              {person.isOnline && (
                <div
                  className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"
                  title="Online now"
                />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors truncate">
                  {person.name}
                </h3>
                {isTutor && (
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest">
                    Tutor {person.tutor?.verified && <BadgeCheck className="h-3 w-3 ml-1 inline" />}
                  </Badge>
                )}
              </div>
              {person.username && <p className="text-[10px] font-bold text-primary/80">@{person.username}</p>}
              <div className="flex flex-col gap-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {where && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-3 w-3" /> {where}
                  </span>
                )}
                {person.county && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {person.county}
                  </span>
                )}
                {isTutor && (
                  <span className="flex items-center gap-1.5 normal-case tracking-normal">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    {person.tutor?.reviewCount && person.tutor.rating
                      ? `${person.tutor.rating.toFixed(1)} (${person.tutor.reviewCount})`
                      : "No reviews yet"}
                    {person.tutor?.hourlyRate ? ` · KSh ${person.tutor.hourlyRate}/hr` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onConnect(person)}
            disabled={connecting}
            aria-label={`Connect with ${person.name}`}
            className="rounded-xl hover:bg-primary/10 hover:text-primary shrink-0"
          >
            {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          </Button>
        </div>

        {subjects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className={`text-[10px] font-bold rounded-full ${shared.has(s.toLowerCase()) ? "border-primary/40 text-primary bg-primary/5" : ""}`}
              >
                {s}
              </Badge>
            ))}
            {person.subjects.length > 3 && (
              <Badge variant="outline" className="text-[10px] font-bold rounded-full">
                +{person.subjects.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Link href={`/profile/${person.id}`} className="flex-1">
            <Button className="w-full rounded-xl font-black text-xs tracking-widest h-11 bg-foreground text-background hover:bg-foreground/90 uppercase">
              View Profile
            </Button>
          </Link>
          {isTutor ? (
            <Link href={`/dashboard/tutors?q=${encodeURIComponent(person.name)}`}>
              <Button
                variant="outline"
                className="rounded-xl font-black text-xs tracking-widest h-11 uppercase border-border bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors min-w-[110px]"
              >
                Book
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={() => onConnect(person)}
              disabled={connecting}
              className="rounded-xl font-black text-xs tracking-widest h-11 uppercase border-border bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors min-w-[110px]"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Connect
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
