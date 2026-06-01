"use client";

import { useState } from "react";
import { Star, MessageSquare, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSessionReview } from "@/app/actions/reviews";
import { motion, AnimatePresence } from "framer-motion";

interface SessionReviewModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  tutorName: string;
  subject: string;
}

export default function SessionReviewModal({
  open,
  onClose,
  sessionId,
  tutorName,
  subject,
}: SessionReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Tap a star to rate your session");
      return;
    }
    setSubmitting(true);
    try {
      await createSessionReview(sessionId, rating, comment || undefined);
      setSubmitted(true);
      toast.success("Review submitted — thank you!");
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const labels = ["", "Needs work", "Okay", "Good", "Great!", "Excellent!"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-background border border-border rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <p className="text-2xl font-black tracking-tight">Review Sent!</p>
                <p className="text-muted-foreground font-medium">
                  Your feedback helps {tutorName} grow.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-2xl font-black tracking-tight">
                    Rate Your Session
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    How was studying {subject} with {tutorName}?
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-all hover:scale-110 active:scale-90"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoveredStar || rating)
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground/30"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                {rating > 0 && (
                  <p className="text-center text-sm font-bold text-primary">
                    {labels[rating]}
                  </p>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Write a review (optional)
                  </label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like? What could be better?"
                    className="rounded-2xl min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {comment.length}/500
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm tracking-widest uppercase shadow-xl"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" /> Submit Review
                    </span>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
