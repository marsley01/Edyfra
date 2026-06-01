"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitReview, Review } from "@/app/actions/reviews";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { toast } from "sonner";

interface TestimonialsProps {
  initialReviews: Review[];
}

export function HomeTestimonials({ initialReviews }: TestimonialsProps) {
  const [reviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ author_name: "", school: "", quote: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await submitReview(form);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSubmitted(true);
      setShowForm(false);
      toast.success("Review submitted! It will appear after moderation.");
    }
  };

  return (
    <section className="py-32 md:py-48 bg-secondary/30 overflow-hidden">
      <div className="container-max space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Loved by scholars.</h2>
            <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
              Authentic feedback from students dominating their fields.
            </p>
          </div>
          {!submitted && (
            <Button
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              className="h-12 px-8 rounded-full font-black text-[10px] tracking-widest uppercase border-border hover:border-primary hover:text-primary transition-all"
            >
              {showForm ? "Cancel" : "Share Your Experience"}
            </Button>
          )}
        </div>

        {/* Review Submission Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleSubmit}
                className="p-10 md:p-16 bg-background rounded-[3rem] border border-border space-y-8 shadow-sm"
              >
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Share Your Protocol</p>
                  <h3 className="text-3xl font-black tracking-tightest">Write a Review</h3>
                  <p className="text-muted-foreground font-medium">Your review will be moderated before going live.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-2">Your Name *</label>
                    <Input
                      required
                      value={form.author_name}
                      onChange={e => setForm({ ...form, author_name: e.target.value })}
                      placeholder="Kennedy Mutua"
                      className="h-14 rounded-2xl px-6 border-border bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-2">Institution (Optional)</label>
                    <Input
                      value={form.school}
                      onChange={e => setForm({ ...form, school: e.target.value })}
                      placeholder="University of Nairobi"
                      className="h-14 rounded-2xl px-6 border-border bg-secondary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-2">Your Experience * <span className="text-muted-foreground normal-case">(min 20 chars)</span></label>
                  <textarea
                    required
                    value={form.quote}
                    onChange={e => setForm({ ...form, quote: e.target.value })}
                    placeholder="Tell us how Edyfra changed your academic trajectory..."
                    rows={4}
                    className="w-full p-6 rounded-2xl border border-border bg-secondary font-medium text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <p className="text-right text-[10px] text-muted-foreground font-bold">{form.quote.length}/500</p>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-14 px-12 rounded-full bg-foreground text-background font-black text-[10px] tracking-widest uppercase shadow-xl transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit Review</>}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews Display */}
        {reviews.length > 0 ? (
          <div className="flex overflow-x-auto gap-8 pb-12 px-4 scrollbar-hide snap-x snap-mandatory">
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="min-w-[300px] md:min-w-[450px] snap-center bg-background p-10 rounded-[2.5rem] border border-border shadow-sm space-y-8 flex flex-col justify-between"
              >
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-primary text-primary" />)}
                </div>
                <p className="text-xl md:text-2xl font-medium leading-relaxed italic text-foreground/90">&quot;{r.quote}&quot;</p>
                <div className="flex items-center gap-4">
                  <AvatarPremium seed={r.author_name} size="md" name={r.author_name} />
                  <div>
                    <h4 className="font-black text-sm tracking-tight">{r.author_name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{r.school}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-[2rem] bg-secondary flex items-center justify-center">
              <Star className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tightest">No reviews yet.</h3>
              <p className="text-muted-foreground font-medium max-w-sm">Be the first scholar to share your experience on the platform.</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="h-12 px-10 rounded-full bg-primary text-white font-black text-[10px] tracking-widest uppercase"
            >
              Write the First Review
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
