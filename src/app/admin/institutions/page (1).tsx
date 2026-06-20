"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Loader2, CheckCircle, XCircle, Clock, ExternalLink, Mail, Phone, MessageSquare, Shield
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Application = {
  id: string;
  name: string;
  email: string;
  institutionName: string;
  phone: string | null;
  message: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  reviewedBy: { name: string; email: string } | null;
};

export default function AdminInstitutionsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const { getInstitutionApplications } = await import("@/app/actions/institution-auth");
      const data = await getInstitutionApplications();
      setApplications(data as Application[]);
    } catch {
      toast.error("Failed to load applications");
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await checkAdminStatus())) { router.push("/dashboard"); return; }
      await load();
    };
    init();
  }, [router]);

  const handleReview = async (id: string, action: "APPROVED" | "REJECTED") => {
    setActionLoading(id);
    try {
      const { reviewInstitutionApplication } = await import("@/app/actions/institution-auth");
      const result = await reviewInstitutionApplication(id, action, notesMap[id] || undefined);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Application ${action.toLowerCase()} successfully`);
        await load();
      }
    } catch {
      toast.error("Failed to review application");
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-400" />
          Institution Applications
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and manage institution registration requests
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Pending Review ({pending.length})
          </h2>
          <div className="grid gap-4">
            {pending.map((app) => (
              <Card key={app.id} className="border-amber-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{app.institutionName}</CardTitle>
                      <CardDescription className="mt-1 space-y-1">
                        <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" />{app.name}</span>
                        <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{app.email}</span>
                        {app.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{app.phone}</span>}
                      </CardDescription>
                    </div>
                    {statusBadge(app.status)}
                  </div>
                </CardHeader>
                {app.message && (
                  <CardContent className="pb-3 pt-0">
                    <div className="flex gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>{app.message}</p>
                    </div>
                  </CardContent>
                )}
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Admin Notes</label>
                      <Textarea
                        placeholder="Add notes about this application..."
                        className="mt-1 text-sm"
                        rows={2}
                        value={notesMap[app.id] || ""}
                        onChange={(e) => setNotesMap((m) => ({ ...m, [app.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={actionLoading === app.id}
                        onClick={() => handleReview(app.id, "APPROVED")}
                      >
                        {actionLoading === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading === app.id}
                        onClick={() => handleReview(app.id, "REJECTED")}
                      >
                        {actionLoading === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <Card className="border-muted">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending institution applications.</p>
          </CardContent>
        </Card>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Review History ({reviewed.length})</h2>
          <div className="grid gap-3">
            {reviewed.map((app) => (
              <Card key={app.id} className="border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{app.institutionName}</CardTitle>
                      <CardDescription>
                        {app.name} &middot; {app.email}
                      </CardDescription>
                    </div>
                    {statusBadge(app.status)}
                  </div>
                </CardHeader>
                {app.adminNotes && (
                  <CardContent className="pb-2 pt-0">
                    <p className="text-sm text-muted-foreground italic">
                      Notes: {app.adminNotes}
                    </p>
                  </CardContent>
                )}
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Reviewed by {app.reviewedBy?.name || app.reviewedBy?.email || "Unknown"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
