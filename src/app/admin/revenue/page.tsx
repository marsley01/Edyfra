export const dynamic = 'force-dynamic';

import prisma from "@/lib/prisma";
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

async function getRevenueStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all successful payments for calculation
  const successfulPayments = await prisma.payment.findMany({
    where: { status: "completed" }
  });

  const totalRevenue = successfulPayments.reduce((acc: number, curr) => acc + (curr.amount || 0), 0);
  const monthlyRevenue = successfulPayments
    .filter(p => p.paidAt && new Date(p.paidAt) >= startOfMonth)
    .reduce((acc: number, curr) => acc + (curr.amount || 0), 0);

  // Stream breakdown
  const breakdown: Record<string, number> = {
    SUBSCRIPTION: 0,
    SESSION: 0,
    RESOURCE: 0
  };
  successfulPayments.forEach((p: any) => {
    const type = p.paymentType as string;
    breakdown[type] = (breakdown[type] || 0) + (p.amount || 0);
  });

  const streamBreakdown = Object.entries(breakdown).map(([type, amount]) => ({
    paymentType: type,
    _sum: { amount }
  }));

  const plusSubscribers = await prisma.user.count({
    where: { plan: "plus" }
  });

  const totalUsers = await prisma.user.count();
  const conversionRate = totalUsers > 0 ? (plusSubscribers / totalUsers) * 100 : 0;

  const recentTransactions = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: true }
  });

  // For pending payouts, we'll also use findMany to avoid similar errors
  const sessionPayments = await prisma.sessionPayment.findMany({
    where: { refundedAt: null }
  });
  const pendingPayouts = sessionPayments.reduce((acc: number, curr) => acc + (curr.tutorPayout || 0), 0);

  return {
    total: totalRevenue,
    monthly: monthlyRevenue,
    breakdown: streamBreakdown,
    plusCount: plusSubscribers,
    conversion: conversionRate,
    transactions: recentTransactions,
    pendingPayouts: pendingPayouts
  };
}

export default async function AdminRevenuePage() {
  const stats = await getRevenueStats();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tightest">Revenue <span className="text-primary">Dashboard</span></h1>
          <p className="text-muted-foreground font-medium">Telemetry for Edyfra's monetization ecosystem.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 px-6 rounded-xl border-2 font-black text-xs uppercase tracking-widest gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="h-11 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
            Pay All Tutors
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-border bg-secondary/20 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-primary" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tightest">KES {stats.total.toLocaleString()}</div>
            <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> +12.5% from last month
            </p>
          </CardContent>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrendingUp className="h-12 w-12" />
          </div>
        </Card>

        <Card className="rounded-[2rem] border-border bg-secondary/20 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Users className="h-3 w-3 text-blue-500" /> Plus Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tightest">{stats.plusCount}</div>
            <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">
               {stats.conversion.toFixed(1)}% Conversion Rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border bg-secondary/20 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-emerald-500" /> Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tightest">KES {stats.pendingPayouts.toLocaleString()}</div>
            <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-widest">
               12 Tutors Waiting
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border bg-secondary/20 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-3 w-3 text-purple-500" /> Marketplace Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tightest">KES 4,200</div>
            <p className="text-[10px] font-bold text-purple-500 mt-1 uppercase tracking-widest">
               24 Items Sold Today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Logs */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-border bg-background shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b border-border/50">
            <CardTitle className="text-xl font-black tracking-tightest">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="p-4 pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="p-4 pr-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stats.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-black uppercase">
                            {tx.user.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{tx.user.name}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{tx.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-black text-sm">KES {tx.amount}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                          {tx.paymentType}
                        </span>
                      </td>
                      <td className="p-4">
                        {tx.status === "completed" ? (
                          <div className="flex items-center gap-1.5 text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
                          </div>
                        ) : tx.status === "pending" ? (
                          <div className="flex items-center gap-1.5 text-amber-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-500">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 pr-8 text-xs font-medium text-muted-foreground">
                        {tx.createdAt ? format(new Date(tx.createdAt), "MMM d, HH:mm") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="rounded-[2.5rem] border-border bg-background shadow-xl overflow-hidden">
          <CardHeader className="p-8 border-b border-border/50">
            <CardTitle className="text-xl font-black tracking-tightest">Revenue Stream</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {['SUBSCRIPTION', 'SESSION', 'RESOURCE'].map((type) => {
              const val = (stats.breakdown as any[]).find(b => b.paymentType === type)?._sum.amount || 0;
              const percent = stats.total > 0 ? (val / stats.total) * 100 : 0;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{type}</span>
                    <span className="text-sm font-black tracking-tightest">KES {val.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${type === 'SUBSCRIPTION' ? 'bg-primary' : type === 'SESSION' ? 'bg-blue-500' : 'bg-purple-500'}`} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
