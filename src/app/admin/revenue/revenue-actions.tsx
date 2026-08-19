"use client";

import { useState } from "react";
import { Download, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { markAllPayoutsPaid } from "@/app/actions/admin-revenue";

type CsvTransaction = {
  id: string;
  amount: number;
  phone: string;
  paymentType: string;
  status: string;
  createdAt: string | null;
  user: {
    name: string;
  };
};

export function RevenueActions({ transactions }: { transactions: CsvTransaction[] }) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const handleExportCsv = () => {
    const header = ["User", "Phone", "Amount (KES)", "Type", "Status", "Date"];
    const rows = transactions.map((tx) => [
      tx.user?.name || "",
      tx.phone || "",
      tx.amount,
      tx.paymentType || "",
      tx.status || "",
      tx.createdAt ? new Date(tx.createdAt).toISOString() : "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edyfra-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePayAll = async () => {
    if (!confirm("Mark all outstanding tutor payouts as paid? This cannot be undone.")) return;
    setPaying(true);
    try {
      const result = await markAllPayoutsPaid();
      if (result.success) {
        showSuccess("Payouts settled", {
          description: `${result.count} pending payout${result.count === 1 ? "" : "s"} marked as paid.`,
        });
        router.refresh();
      } else {
        showError({
          title: "Couldn't process payouts",
          cause: result.error || "Something didn't go through on our side.",
          fix: "Try again, or refresh the page.",
        });
      }
    } catch (err) {
      showError({
        title: "Couldn't process payouts",
        cause: "Something didn't go through on our side.",
        fix: "Try again, or refresh the page.",
      });
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex gap-3">
      <Button variant="outline" onClick={handleExportCsv} className="h-11 px-6 rounded-xl border-2 font-black text-xs uppercase tracking-widest gap-2">
        <Download className="h-4 w-4" /> Export CSV
      </Button>
      <Button onClick={handlePayAll} disabled={paying} className="h-11 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 gap-2">
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {paying ? "Processing..." : "Pay All Tutors"}
      </Button>
    </div>
  );
}