"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, FileText, ExternalLink, Trash2 } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { getPendingResources, getAllResources } = await import("@/app/actions/admin");
      const data = pendingOnly ? await getPendingResources() : await getAllResources();
      setResources(data);
    } catch {
      showError({
        title: "We couldn't load resources",
        cause: "A hiccup on our side blocked the load.",
        fix: "Try again, or refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [pendingOnly]);

  const handleApprove = async (id: string) => {
    const { approveResource } = await import("@/app/actions/admin");
    const result = await approveResource(id);
    if (result.success) {
      showSuccess("Resource approved", { description: "It's now visible in the library." });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } else {
      showError({
        title: "We couldn't approve that resource",
        cause: result.error || "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
    }
  };

  const handleReject = async (id: string) => {
    const { rejectResource } = await import("@/app/actions/admin");
    const result = await rejectResource(id);
    if (result.success) {
      showSuccess("Resource rejected", { description: "It's been removed from the queue." });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } else {
      showError({
        title: "We couldn't reject that resource",
        cause: result.error || "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
    const { deleteResource } = await import("@/app/actions/admin-content");
    const result = await deleteResource(id);
    if (result.success) {
      showSuccess("Resource deleted", { description: "It's been removed from the library." });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } else {
      showError({
        title: "We couldn't delete that resource",
        cause: result.error || "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Resource Hub</h1>
            <p className="text-muted-foreground font-medium mt-1">Moderate tutor-uploaded resources and curriculum content</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={pendingOnly ? "default" : "outline"}
            onClick={() => setPendingOnly(true)}
            className="rounded-xl text-xs"
          >
            Pending Review
          </Button>
          <Button
            variant={!pendingOnly ? "default" : "outline"}
            onClick={() => setPendingOnly(false)}
            className="rounded-xl text-xs"
          >
            All Resources
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : resources.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="text-lg font-bold">All clear — no resources pending review</p>
            <p className="text-sm text-muted-foreground">New uploads will appear here for approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resources.map((r) => (
            <Card key={r.id} className={cn(
              "rounded-2xl border-l-4",
              r.status === "pending" ? "border-l-amber-500" : r.status === "approved" ? "border-l-emerald-500" : "border-l-red-500"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-black truncate">{r.title}</h3>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase tracking-widest",
                        r.status === "pending" && "border-amber-500/30 text-amber-500",
                        r.status === "approved" && "border-emerald-500/30 text-emerald-500",
                        r.status === "rejected" && "border-red-500/30 text-red-500",
                      )}>
                        {r.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-widest">
                        {r.resourceType || "General"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>by {r.seller?.name || "Unknown"}</span>
                      <span>{r.subject}</span>
                      <span>{r.educationLevel}</span>
                      {r.price > 0 ? <span>Ksh {r.price}</span> : <span className="text-emerald-500">Free</span>}
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleApprove(r.id)}
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(r.id)}
                          size="sm"
                          variant="destructive"
                          className="rounded-xl"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {r.filePath && (
                      <a href={r.filePath} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="rounded-xl">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => handleDelete(r.id, r.title)}
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
