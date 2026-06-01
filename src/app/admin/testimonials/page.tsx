"use client";

import { useEffect, useState } from "react";
import { checkAdminStatus } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TestimonialsPage() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { getTestimonials } = await import("@/app/actions/admin-content");
    const data = await getTestimonials();
    setTestimonials(data);
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

  const handleApprove = async (id: string) => {
    const { approveTestimonial } = await import("@/app/actions/admin-content");
    await approveTestimonial(id);
    toast.success("Approved");
    await load();
  };

  const handleReject = async (id: string) => {
    const { rejectTestimonial } = await import("@/app/actions/admin-content");
    await rejectTestimonial(id);
    toast.success("Rejected");
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const pending = testimonials.filter((t) => !t.isApproved);
  const approved = testimonials.filter((t) => t.isApproved);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tighter">Testimonials</h1>
        <p className="text-muted-foreground font-medium mt-1">Approve or reject user testimonials</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tight text-amber-500">Pending Review ({pending.length})</h2>
          {pending.map((t) => (
            <Card key={t.id} className="rounded-2xl border-border/50 border-amber-500/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                    </div>
                    <p className="italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                    <p className="font-bold">— {t.authorName}{t.school ? `, ${t.school}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button onClick={() => handleApprove(t.id)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                    <Button onClick={() => handleReject(t.id)} variant="outline" className="rounded-xl text-destructive"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-black tracking-tight">Approved ({approved.length})</h2>
        {approved.map((t) => (
          <Card key={t.id} className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
              </div>
              <p className="text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-sm font-bold mt-1">— {t.authorName}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
