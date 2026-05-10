"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellOff, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return (
    <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tightest">Notifications</h1>
        <p className="text-muted-foreground font-medium mt-1">See what&apos;s happened since your last visit.</p>
      </div>

      <Card className="min-h-[300px] flex flex-col items-center justify-center text-center p-12 border-border rounded-2xl">
        <div className="bg-secondary p-6 rounded-full mb-6">
          <BellOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl font-black">All caught up!</CardTitle>
        <p className="text-muted-foreground font-medium mt-2">You&apos;ll see new activity here.</p>
      </Card>
    </div>
  );
}
