"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Loader2, Flag, UserX, Ban, Gavel } from "lucide-react";
import { toast } from "sonner";
import { getModerationReports } from "@/app/actions/moderation";

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "flagged">("reports");

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await checkAdminStatus())) { router.push("/dashboard"); return; }
      const { getReports } = await import("@/app/actions/admin-content");
      const [reportsData, modData] = await Promise.all([
        getReports(),
        getModerationReports().catch(() => ({ reports: [], flaggedUsers: [] })),
      ]);
      setReports(reportsData);
      setFlaggedUsers(modData.flaggedUsers || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleAction = async (reportId: string, action: "warn" | "suspend" | "ban") => {
    const { actionReport } = await import("@/app/actions/admin-content");
    await actionReport(reportId, action);
    toast.success(`User ${action}ed`);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Content Moderation</h1>
          <p className="text-muted-foreground font-medium mt-1">Review reported content, auto-flagged messages, and user strikes</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setTab("reports")} variant={tab === "reports" ? "default" : "outline"} className="rounded-xl">
          <Flag className="h-4 w-4 mr-2" /> Reports ({reports.length})
        </Button>
        <Button onClick={() => setTab("flagged")} variant={tab === "flagged" ? "default" : "outline"} className="rounded-xl">
          <UserX className="h-4 w-4 mr-2" /> Flagged Users ({flaggedUsers.length})
        </Button>
      </div>

      {tab === "reports" && (
        <>
          {reports.length === 0 ? (
            <Card className="rounded-[2rem] border-border/50 bg-secondary/30">
              <CardContent className="p-16 text-center space-y-4">
                <ShieldCheck className="h-12 w-12 text-emerald-500/40 mx-auto" />
                <p className="text-lg font-black">All Clear</p>
                <p className="text-muted-foreground">No reports to review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="rounded-2xl border-border/50">
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="font-bold">Reported User: {report.reportedUserId?.slice(0, 8)}...</span>
                        <Badge className="text-[8px] font-black uppercase tracking-widest" variant={report.status === "pending" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Reason: {report.reason}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                        <span>{report.contentType}</span>
                        <span>·</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>Reporter: {report.reporterId === "moderation-bot" ? "Auto-flagged" : report.reporterId?.slice(0, 8) + "..."}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAction(report.id, "warn")} variant="outline" size="sm" className="rounded-xl">Warn</Button>
                      <Button onClick={() => handleAction(report.id, "suspend")} variant="outline" size="sm" className="rounded-xl text-amber-500">Suspend</Button>
                      <Button onClick={() => handleAction(report.id, "ban")} size="sm" className="rounded-xl bg-destructive text-destructive-foreground">Ban</Button>
                      <Button onClick={async () => { const { dismissReport } = await import("@/app/actions/admin-content"); await dismissReport(report.id); setReports((prev) => prev.filter((r) => r.id !== report.id)); toast.success("Dismissed"); }} variant="ghost" size="sm" className="rounded-xl">Dismiss</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "flagged" && (
        <Card className="rounded-[2rem] border-border/50">
          <CardHeader className="p-6 border-b border-border/30">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Gavel className="h-5 w-5 text-amber-500" /> Users with Strikes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {flaggedUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 font-medium">No flagged users</p>
            ) : (
              flaggedUsers.map((u: any) => (
                <div key={u.id} className="p-6 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                      u.strikes >= 5 ? "bg-destructive/20 text-destructive" :
                      u.strikes >= 3 ? "bg-amber-500/20 text-amber-500" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {u.strikes}
                    </div>
                    <div>
                      <p className="font-bold">{u.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>ID: {u.id.slice(0, 8)}...</span>
                        {u.banned && <Badge className="bg-destructive/10 text-destructive text-[8px] font-black uppercase tracking-widest">Banned</Badge>}
                        {u.suspended && <Badge className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest">Suspended</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.strikes >= 3 && !u.suspended && (
                      <Button size="sm" variant="outline" className="rounded-xl text-amber-500 text-[10px]" onClick={async () => {
                        const { actionReport } = await import("@/app/actions/admin-content");
                        await actionReport("bulk_" + u.id, "suspend");
                        toast.success("Suspended");
                      }}>
                        Suspend
                      </Button>
                    )}
                    {u.strikes >= 5 && !u.banned && (
                      <Button size="sm" className="rounded-xl bg-destructive text-destructive-foreground text-[10px]" onClick={async () => {
                        const { actionReport } = await import("@/app/actions/admin-content");
                        await actionReport("bulk_" + u.id, "ban");
                        toast.success("Banned");
                      }}>
                        <Ban className="h-3 w-3 mr-1" /> Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
