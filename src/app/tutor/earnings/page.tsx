"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, TrendingUp, ArrowDownCircle, 
  History, CreditCard, ShieldCheck, 
  ArrowUpRight, Loader2, DollarSign, Sparkles
} from "lucide-react";
import { getTutorStats } from "@/app/actions/tutor";
import { Badge } from "@/components/ui/badge";

interface TutorStats {
  totalEarnings: number;
  completedSessions: number;
  activeSessions: number;
}

export default function TutorEarningsPage() {
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getTutorStats();
    setStats(data);
    setLoading(false);
  };

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
    }, 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Your Earnings.</h1>
        <p className="text-muted-foreground text-lg font-medium">Manage your payouts and track your growth.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Balance Card */}
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] bg-card border border-border overflow-hidden relative">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Wallet className="h-64 w-64" />
           </div>
           <CardHeader className="p-12 pb-6 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Available Balance</p>
              <div className="flex items-end gap-3 mt-6">
                 <h2 className="text-6xl md:text-7xl font-black tracking-tightest">Ksh {stats?.totalEarnings || 0}</h2>
                 <Badge className="mb-4 bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1">NET</Badge>
              </div>
           </CardHeader>
           <CardContent className="p-12 pt-0 space-y-10 relative z-10">
              <div className="flex flex-col sm:flex-row gap-4">
                 <Button 
                   onClick={handleWithdraw}
                   disabled={withdrawing || (stats?.totalEarnings || 0) < 50}
                   className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {withdrawing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowDownCircle className="h-5 w-5 mr-2" />}
                   Withdraw to M-Pesa
                 </Button>
                 <Button variant="outline" className="h-16 px-10 rounded-2xl border-border bg-secondary/50 hover:bg-secondary font-black text-xs tracking-widest uppercase transition-all">
                   Payment Settings
                 </Button>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                 <ShieldCheck className="h-4 w-4 text-emerald-500" />
                 Secured by Edyfra Escrow Protection
              </div>
           </CardContent>
        </Card>

        {/* Growth Stats */}
        <div className="space-y-6">
           <Card className="border-border bg-secondary/30 rounded-[2.5rem] group hover:border-primary/50 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <TrendingUp className="h-7 w-7" />
                 </div>
                 <div>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Completed</p>
                    <h3 className="text-2xl font-black tracking-tightest">
                    {stats?.completedSessions ? `${stats.completedSessions} sessions` : "Get started"}
                  </h3>
                 </div>
              </CardContent>
           </Card>
           <Card className="border-border bg-secondary/30 rounded-[2.5rem] group hover:border-primary/50 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Sparkles className="h-7 w-7" />
                 </div>
                 <div>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Now</p>
                     <h3 className="text-2xl font-black tracking-tightest">{stats?.activeSessions || 0}</h3>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-8">
        <h2 className="text-3xl font-black tracking-tightest px-2">Recent Payouts</h2>
        <Card className="border-border bg-card/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-12">
             <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
                <History className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-muted-foreground font-medium max-w-xs mx-auto">Your session history and payouts will appear here once you start teaching.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
