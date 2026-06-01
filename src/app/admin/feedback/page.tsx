"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { checkAdminStatus } from "@/app/actions/admin";
import { getAllReviewsForAdmin } from "@/app/actions/reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MessageSquare, TrendingUp, Search, Loader2, Trophy, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ reviews: any[]; tutorRankings: any[] } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await checkAdminStatus())) { router.push("/dashboard"); return; }
      const result = await getAllReviewsForAdmin();
      setData(result);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  const { reviews, tutorRankings } = data;

  const filteredReviews = reviews.filter((r: any) =>
    !search || r.reviewer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reviewee?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Tutor Feedback</h1>
          <p className="text-muted-foreground font-medium mt-1">Student reviews, ratings, and tutor rankings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Reviews</p>
            <p className="text-3xl font-black">{reviews.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Rating</p>
            <p className="text-3xl font-black flex items-center gap-2">
              {avgRating} <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Tutors</p>
            <p className="text-3xl font-black">{tutorRankings.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">5-Star Reviews</p>
            <p className="text-3xl font-black">{reviews.filter((r: any) => r.rating === 5).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tutor Rankings */}
        <Card className="lg:col-span-1 rounded-[2rem] border-border/50 h-fit">
          <CardHeader className="p-6 border-b border-border/30">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Tutor Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {tutorRankings.map((t: any, i: number) => (
              <motion.div
                key={t.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                  i === 1 ? "bg-gray-400/20 text-gray-400" :
                  i === 2 ? "bg-amber-700/20 text-amber-700" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.user?.name || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">{t.totalSessions} sessions</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-black">{t.rating.toFixed(1)}</span>
                </div>
              </motion.div>
            ))}
            {tutorRankings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No tutors ranked yet</p>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card className="lg:col-span-2 rounded-[2rem] border-border/50">
          <CardHeader className="p-6 border-b border-border/30 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black">All Reviews</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl h-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {filteredReviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 font-medium">No reviews match your search</p>
            ) : (
              filteredReviews.map((r: any) => (
                <div key={r.id} className="p-6 space-y-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <Badge variant="outline" className="rounded-full text-[9px] font-black uppercase tracking-widest border-border/50">
                        {r.session?.subject || "General"}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <span>{r.reviewer?.name || "Anonymous"}</span>
                    <span>→</span>
                    <span className="text-primary">{r.reviewee?.name || "Tutor"}</span>
                    {r.session?.tier && (
                      <>
                        <span>·</span>
                        <span>{r.session.tier}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
