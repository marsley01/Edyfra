"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { getUserData } from "@/app/actions/user";
import { OverviewTab } from "@/components/tutor/OverviewTab";

export default function TutorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const user = await getUserData() as any;
    if (user) {
      setUserData(user);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/10 to-primary/5 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full translate-y-1/3 translate-x-1/3 pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 text-sm text-primary mb-3 uppercase tracking-widest font-black">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Overview</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest">Welcome back, {userData?.name?.split(" ")[0] || "Tutor"}</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Here's what's happening with your sessions today.</p>
        </div>

        <OverviewTab />
      </div>
    </div>
  );
}
