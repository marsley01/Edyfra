// src/app/admin/bookings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminBookings, adminCancelBooking, adminConfirmBooking } from "@/app/actions/admin";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Calendar, Clock, User, Search, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, BookOpen, ChevronDown,
  Flag, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { motion, AnimatePresence } from "framer-motion";

type BookingFilter = "all" | "pending" | "confirmed" | "declined" | "completed" | "tutor_no_show";

const FILTER_TABS: { label: string; value: BookingFilter; color: string }[] = [
  { label: "All", value: "all", color: "bg-secondary text-foreground" },
  { label: "Pending", value: "pending", color: "bg-yellow-500/10 text-yellow-500" },
  { label: "Confirmed", value: "confirmed", color: "bg-emerald-500/10 text-emerald-500" },
  { label: "Declined", value: "declined", color: "bg-red-500/10 text-red-500" },
  { label: "Completed", value: "completed", color: "bg-blue-500/10 text-blue-500" },
  { label: "No-Show", value: "tutor_no_show", color: "bg-orange-500/10 text-orange-500" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:        { label: "Pending",   color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",  icon: Clock },
  confirmed:      { label: "Confirmed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  declined:       { label: "Declined",  color: "bg-red-500/10 text-red-500 border-red-500/20",           icon: XCircle },
  completed:      { label: "Completed", color: "bg-blue-500/10 text-blue-500 border-blue-500/20",         icon: CheckCircle2 },
  cancelled:      { label: "Cancelled", color: "bg-slate-500/10 text-slate-400 border-slate-500/20",      icon: XCircle },
  tutor_no_show:  { label: "No-Show",   color: "bg-orange-500/10 text-orange-500 border-orange-500/20",   icon: AlertTriangle },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async (filter: BookingFilter) => {
    setLoading(true);
    try {
      const data = await getAdminBookings(filter);
      setBookings(data as any[]);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(activeFilter);
  }, [activeFilter, fetchBookings]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      bookings.filter((b) =>
        b.subject?.toLowerCase().includes(q) ||
        b.topic?.toLowerCase().includes(q) ||
        b.student?.name?.toLowerCase().includes(q) ||
        b.tutor?.name?.toLowerCase().includes(q)
      )
    );
  }, [bookings, search]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id + "-confirm");
    const res = await adminConfirmBooking(id);
    if ((res as any).success) {
      toast.success("Booking confirmed");
      fetchBookings(activeFilter);
    } else {
      toast.error((res as any).error || "Failed");
    }
    setActionLoading(null);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id + "-cancel");
    const res = await adminCancelBooking(id, "Admin override");
    if ((res as any).success) {
      toast.success("Booking cancelled");
      fetchBookings(activeFilter);
    } else {
      toast.error((res as any).error || "Failed");
    }
    setActionLoading(null);
  };

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    declined: bookings.filter(b => b.status === "declined").length,
    completed: bookings.filter(b => b.status === "completed").length,
    tutor_no_show: bookings.filter(b => b.status === "tutor_no_show").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">Booking Oversight</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Monitor, confirm, and manage all tutor session bookings.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => fetchBookings(activeFilter)}
          className="rounded-full text-xs font-black uppercase tracking-widest gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`p-4 rounded-2xl border text-left transition-all duration-300 ${
              activeFilter === tab.value
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                : "border-border bg-secondary/30 hover:border-primary/30"
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{tab.label}</p>
            <p className="text-2xl font-black">{(counts as any)[tab.value]}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student, tutor, subject, or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-xl border-border bg-background/50 font-medium focus-visible:ring-primary"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-32 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading bookings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent rounded-[3rem] py-32 text-center">
          <div className="space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <h3 className="text-xl font-black">No bookings found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try clearing your search." : "No bookings in this category yet."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG["pending"];
            const StatusIcon = status.icon;
            const isExpanded = expandedId === booking.id;
            const bookingDate = new Date(booking.date);
            const isUpcoming = bookingDate >= new Date();
            const hasFlags = booking.flags?.length > 0;

            return (
              <motion.div
                key={booking.id}
                layout
                className={`rounded-[1.5rem] border bg-secondary/20 overflow-hidden transition-all duration-300 ${
                  isExpanded ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border/50 hover:border-primary/20"
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    booking.status === "confirmed" ? "bg-emerald-500 animate-pulse" :
                    booking.status === "pending" ? "bg-yellow-500 animate-pulse" :
                    booking.status === "tutor_no_show" ? "bg-orange-500" :
                    booking.status === "completed" ? "bg-blue-500" : "bg-slate-500"
                  }`} />

                  {/* Subject */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm truncate">{booking.subject}</p>
                      {hasFlags && <Flag className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">{booking.topic || "General session"}</p>
                  </div>

                  {/* People */}
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <AvatarPremium seed={booking.student?.name} size="sm" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student</p>
                        <p className="text-xs font-bold">{booking.student?.name}</p>
                      </div>
                    </div>
                    <div className="w-6 text-center text-muted-foreground text-xs">↔</div>
                    <div className="flex items-center gap-2">
                      <AvatarPremium seed={booking.tutor?.name} size="sm" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tutor</p>
                        <p className="text-xs font-bold">{booking.tutor?.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div className="hidden lg:flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <Calendar className="h-3 w-3 text-primary" />
                      {bookingDate.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      {booking.startTime} · {booking.durationMinutes}min
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge className={`${status.color} border text-[9px] font-black uppercase tracking-widest flex-shrink-0 flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>

                  <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 border-t border-border/50 space-y-5">
                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
                          <div className="p-4 rounded-xl bg-background border border-border/50 space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Booking ID</p>
                            <p className="text-xs font-mono font-bold truncate">{booking.id.slice(0, 16)}…</p>
                          </div>
                          <div className="p-4 rounded-xl bg-background border border-border/50 space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Duration</p>
                            <p className="text-xs font-bold">{booking.durationMinutes} minutes</p>
                          </div>
                          <div className="p-4 rounded-xl bg-background border border-border/50 space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Amount</p>
                            <p className="text-xs font-bold">KSH {booking.amount || 0}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-background border border-border/50 space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Created</p>
                            <p className="text-xs font-bold">{new Date(booking.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Student / Tutor details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: "Student", person: booking.student },
                            { label: "Tutor", person: booking.tutor },
                          ].map(({ label, person }) => (
                            <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border/50">
                              <AvatarPremium seed={person?.name} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                <p className="font-bold text-sm">{person?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{person?.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Decline reason if present */}
                        {booking.declineReason && (
                          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Reason</p>
                            <p className="text-sm font-medium text-muted-foreground">{booking.declineReason}</p>
                          </div>
                        )}

                        {/* Flags */}
                        {hasFlags && (
                          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-1">
                              <Flag className="h-3 w-3" /> Session Flags ({booking.flags.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {booking.flags.map((flag: any) => (
                                <Badge key={flag.id} className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] uppercase tracking-widest">
                                  {flag.flagType}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin Actions */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-auto">Admin Actions</p>

                          {booking.status === "confirmed" && isUpcoming && (
                            <a
                              href={`/study-room/${booking.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest gap-1 border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                            >
                              <ArrowUpRight className="h-3 w-3" /> View Room
                            </a>
                          )}

                          {booking.status === "pending" && (
                            <Button
                              onClick={() => handleConfirm(booking.id)}
                              disabled={actionLoading === booking.id + "-confirm"}
                              className="h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              {actionLoading === booking.id + "-confirm" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><CheckCircle2 className="h-3 w-3" /> Force Confirm</>
                              )}
                            </Button>
                          )}

                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <Button
                              onClick={() => handleCancel(booking.id)}
                              disabled={actionLoading === booking.id + "-cancel"}
                              variant="outline"
                              className="h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                            >
                              {actionLoading === booking.id + "-cancel" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><XCircle className="h-3 w-3" /> Cancel</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
