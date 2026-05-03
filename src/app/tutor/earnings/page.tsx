"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, TrendingUp, ArrowDownCircle, 
  History, CreditCard, ShieldCheck, 
  ArrowUpRight, Loader2, DollarSign
} from "lucide-react";
import { getTutorStats } from "@/app/actions/tutor";
import { Badge } from "@/components/ui/badge";

export default function TutorEarningsPage() {
  const [stats, setStats] = useState<any>(null);
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
      // Logic for M-Pesa trigger would go here
    }, 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground font-medium italic">Track your earnings and manage your payouts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Balance Card */}
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] bg-slate-900 text-white overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="h-40 w-40" />
           </div>
           <CardHeader className="p-12 pb-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-teal-400">Available Balance</CardTitle>
              <div className="flex items-end gap-3 mt-4">
                 <h2 className="text-6xl font-black tracking-tighter">Ksh {stats?.totalEarnings || 0}</h2>
                 <Badge className="mb-3 bg-teal-500/20 text-teal-400 border-none">Tax Inclusive</Badge>
              </div>
           </CardHeader>
           <CardContent className="p-12 pt-0 space-y-8">
              <div className="flex gap-4">
                 <Button 
                   onClick={handleWithdraw}
                   disabled={withdrawing || (stats?.totalEarnings || 0) < 50}
                   className="h-16 px-10 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black tracking-widest shadow-xl shadow-teal-600/20"
                 >
                   {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownCircle className="h-4 w-4 mr-2" />}
                   WITHDRAW TO M-PESA
                 </Button>
                 <Button variant="outline" className="h-16 px-10 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 font-bold">
                   Payment Settings
                 </Button>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                 <ShieldCheck className="h-4 w-4 text-teal-500" />
                 Secured by Edyfra Escrow Protection
              </div>
           </CardContent>
        </Card>

        {/* Growth Stats */}
        <div className="space-y-6">
           <Card className="border-none shadow-sm rounded-[2rem] bg-white dark:bg-slate-900">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center">
                    <TrendingUp className="h-7 w-7" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monthly Growth</p>
                    <h3 className="text-2xl font-black">+24%</h3>
                 </div>
              </CardContent>
           </Card>
           <Card className="border-none shadow-sm rounded-[2rem] bg-white dark:bg-slate-900">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ArrowUpRight className="h-7 w-7" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Next Payout</p>
                    <h3 className="text-2xl font-black">Ksh 1,200</h3>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card className="border-none shadow-sm rounded-[2.5rem]">
        <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
           <CardTitle className="text-xl font-black flex items-center gap-2">
              <History className="h-5 w-5" /> Recent Transactions
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { type: "Session Payout", student: "Mercy W.", amount: "+500", date: "Today, 2:30 PM", status: "COMPLETED" },
                { type: "Withdrawal", student: "M-Pesa Payout", amount: "-1,500", date: "Yesterday, 4:15 PM", status: "PROCESSING" },
                { type: "Session Payout", student: "Kelvin O.", amount: "+500", date: "2 days ago", status: "COMPLETED" },
              ].map((tx, i) => (
                <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all">
                   <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tx.amount.startsWith("+") ? "bg-teal-500/10 text-teal-600" : "bg-slate-100 text-slate-600"}`}>
                         {tx.amount.startsWith("+") ? <DollarSign className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      </div>
                      <div>
                         <p className="font-bold">{tx.type}</p>
                         <p className="text-xs text-muted-foreground font-medium">{tx.student} • {tx.date}</p>
                      </div>
                   </div>
                   <div className="text-right space-y-1">
                      <p className={`font-black text-lg ${tx.amount.startsWith("+") ? "text-teal-600" : "text-slate-900"}`}>{tx.amount} Ksh</p>
                      <Badge variant="outline" className={`text-[8px] font-black border-none ${tx.status === "COMPLETED" ? "bg-teal-500/10 text-teal-600" : "bg-orange-500/10 text-orange-600"}`}>
                        {tx.status}
                      </Badge>
                   </div>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
