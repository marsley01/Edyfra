"use client";

import { useEffect, useState } from "react";
import { isFounderEmail } from "@/utils/admin-guard";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isFounderEmail(user.email)) { router.push("/dashboard"); return; }
      const { getReports } = await import("@/app/actions/admin-content");
      const data = await getReports();
      setReports(data);
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
      <div>
        <h1 className="text-4xl font-black tracking-tighter">Content Moderation</h1>
        <p className="text-muted-foreground font-medium mt-1">Review reported content and take action</p>
      </div>

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
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-bold">Reported User: {report.reportedUserId?.slice(0, 8)}...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reason: {report.reason}</p>
                  <p className="text-xs text-muted-foreground">Type: {report.contentType} • {new Date(report.createdAt).toLocaleDateString()}</p>
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
    </div>
  );
}
