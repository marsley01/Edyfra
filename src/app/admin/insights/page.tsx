"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Globe, Activity, Search, ExternalLink, TrendingUp, Users, BookOpen, Zap, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminDashboardMetrics } from "@/app/actions/admin";

export default function AdminInsightsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboardMetrics().then((m) => {
      setMetrics(m);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const seoStats = [
    { label: "Pages Indexed", value: "—", desc: "Connect Google Search Console" },
    { label: "Organic Traffic", value: "—", desc: "Set up in Vercel Analytics" },
    { label: "Avg. Position", value: "—", desc: "Requires Search Console API" },
    { label: "Click Rate", value: "—", desc: "CTR data not available" },
  ];

  const vercelLinks = [
    { label: "Vercel Analytics Dashboard", url: `https://vercel.com/${process.env.NEXT_PUBLIC_VERCEL_URL || "dashboard"}/analytics`, icon: Activity },
    { label: "Speed Insights", url: `https://vercel.com/${process.env.NEXT_PUBLIC_VERCEL_URL || "dashboard"}/speed-insights`, icon: Zap },
    { label: "Vercel Logs", url: `https://vercel.com/${process.env.NEXT_PUBLIC_VERCEL_URL || "dashboard"}/logs`, icon: BarChart },
    { label: "Google Search Console", url: "https://search.google.com/search-console", icon: Search },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Activity className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Site Insights</h1>
          <p className="text-muted-foreground font-medium mt-1">Analytics, SEO performance, and platform metrics</p>
        </div>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics?.mainStats?.map((stat: any) => (
          <Card key={stat.label} className="rounded-2xl border-border/50">
            <CardContent className="p-6 space-y-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black">{stat.value.toLocaleString()}</p>
              <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-emerald-500 border-emerald-500/30">
                {stat.trend}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Telemetry */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Platform Telemetry
          </CardTitle>
          <CardDescription>Real-time system health and growth indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics?.telemetry?.map((t: any) => (
              <div key={t.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{t.label}</p>
                <p className="text-2xl font-black">{t.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{t.trend}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEO & Vercel Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-black">SEO & Search Performance</CardTitle>
            </div>
            <CardDescription>Search engine visibility and metadata ranking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <Globe className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-500">Meta Tags Status</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The site includes proper meta tags, Open Graph, and Twitter cards in the root layout. 
                  Next.js automatically generates SEO-friendly metadata for each page.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {seoStats.map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-lg font-black mt-1">{s.value}</p>
                  <p className="text-[8px] text-muted-foreground mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-black">Vercel Dashboard</CardTitle>
            </div>
            <CardDescription>External analytics, speed insights, and deployment logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
              <Activity className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-500">Connected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vercel Analytics and Speed Insights are active in the root layout. 
                  Click the links below to open the full dashboards.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {vercelLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{link.label}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
