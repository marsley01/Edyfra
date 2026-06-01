"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { approveReview, deleteReview, Review } from "@/app/actions/reviews";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ReviewsModerationClient({
  pendingReviews,
  approvedReviews,
}: {
  pendingReviews: Review[];
  approvedReviews: Review[];
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const res = await approveReview(id);
    if (res.error) toast.error(res.error);
    else { toast.success("Review approved and published."); router.refresh(); }
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    const res = await deleteReview(id);
    if (res.error) toast.error(res.error);
    else { toast.success("Review deleted."); router.refresh(); }
    setProcessing(null);
  };

  const ReviewCard = ({ review, isPending }: { review: Review; isPending: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6 hover:border-primary/20 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarPremium seed={review.author_name} name={review.author_name} size="md" />
          <div>
            <h4 className="font-black">{review.author_name}</h4>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{review.school}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[9px] font-black tracking-widest ${isPending ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
            {isPending ? "PENDING" : "LIVE"}
          </Badge>
          <span className="text-[9px] font-bold text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium leading-relaxed text-foreground/80 italic">&quot;{review.quote}&quot;</p>

      <div className="flex items-center gap-3 pt-2">
        {isPending && (
          <Button
            onClick={() => handleApprove(review.id)}
            disabled={processing === review.id}
            className="h-10 px-6 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white font-black text-[10px] tracking-widest uppercase transition-all"
          >
            {processing === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>}
          </Button>
        )}
        <Button
          onClick={() => handleDelete(review.id)}
          disabled={processing === review.id}
          variant="ghost"
          className="h-10 px-6 rounded-xl text-destructive hover:bg-destructive/10 font-black text-[10px] tracking-widest uppercase transition-all"
        >
          {processing === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>}
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tighter">Review Moderation</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
          {pendingReviews.length} Pending · {approvedReviews.length} Live
        </p>
      </div>

      {/* Pending Queue */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight">Pending Approval</h2>
          {pendingReviews.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
              {pendingReviews.length} waiting
            </span>
          )}
        </div>

        {pendingReviews.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-[2rem] bg-white/[0.02] border border-white/5">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/40 mx-auto" />
            <p className="text-muted-foreground font-medium">Queue is clear. All reviews processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map(r => <ReviewCard key={r.id} review={r} isPending={true} />)}
          </div>
        )}
      </div>

      {/* Live Reviews */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight">Live Reviews</h2>
        {approvedReviews.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-[2rem] bg-white/[0.02] border border-white/5">
            <Star className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-muted-foreground font-medium">No approved reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedReviews.map(r => <ReviewCard key={r.id} review={r} isPending={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}
