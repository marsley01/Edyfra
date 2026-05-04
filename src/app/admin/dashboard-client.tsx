"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, MessageSquare, TrendingUp, Zap, ChevronRight, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import Link from "next/link";
import { approveReview, deleteReview } from "@/app/actions/reviews";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const ICONS = [Users, GraduationCap, MessageSquare, Zap];
const COLORS = ["text-blue-400", "text-primary", "text-purple-400", "text-orange-400"];
const BGS = ["bg-blue-500/10", "bg-primary/10", "bg-purple-500/10", "bg-orange-500/10"];

interface Stat {
  label: string;
  value: number;
  trend: string;
}

export function AdminDashboardClient({
  stats,
  pendingApplications,
}: {
  stats: Stat[];
  pendingApplications: unknown[];
}) {
  const router = useRouter();

  const handleApprove = async (id: string) => {
    const res = await approveReview(id);
    if (res.error) toast.error(res.error);
    else { toast.success("Approved."); router.refresh(); }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteReview(id);
    if (res.error) toast.error(res.error);
    else { toast.success("Deleted."); router.refresh(); }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Command Overview</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">Platform Status: Optimal</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl font-bold px-8 h-14">
            Audit Logs
          </Button>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = ICONS[i];
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-500">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`${BGS[i]} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${COLORS[i]}`} />
                    </div>
                    <Badge className="font-black text-[9px] tracking-widest border-border">{stat.trend}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
                    <h3 className="text-4xl font-black mt-2 tracking-tighter tabular-nums">{stat.value.toLocaleString()}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tutor Application Queue */}
        <Card className="lg:col-span-2 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Application Queue</CardTitle>
              <CardDescription className="font-medium">Pending tutor verification requests.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingApplications.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <GraduationCap className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-medium">No pending applications. All clear.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingApplications.map((app: unknown) => (
                  <div key={app.id} className="p-8 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                    <div className="flex items-center gap-5">
                      <AvatarPremium seed={app.user?.name || app.id || "default"} size="lg" name={app.user?.name || undefined} />
                      <div>
                        <p className="font-black text-lg">{app.user?.name || "Applicant"}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {app.subject} • {app.educationLevel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-[9px] font-black tracking-widest">PENDING</Badge>
                      <Button size="sm" className="rounded-xl font-black text-xs px-5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Core Vitals */}
        <Card className="rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Cpu className="h-12 w-12 text-primary" />
          </div>
          <CardHeader className="p-10">
            <CardTitle className="text-2xl font-black">Core Vitals</CardTitle>
            <CardDescription>System health indicators.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 space-y-8 pb-10">
            {[
              { label: "AI Gateway", status: "Operational", color: "bg-emerald-500", pct: "98%" },
              { label: "Database", status: "Optimal", color: "bg-primary", pct: "24%" },
              { label: "Auth Service", status: "Active", color: "bg-blue-500", pct: "100%" },
            ].map(v => (
              <div key={v.label} className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
                  <span className="text-muted-foreground">{v.label}</span>
                  <span className="text-emerald-500">{v.status}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: v.pct }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full ${v.color}`}
                  />
                </div>
              </div>
            ))}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs font-bold uppercase tracking-widest">Postgres: Synced</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest">Matchmaking: Live</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
