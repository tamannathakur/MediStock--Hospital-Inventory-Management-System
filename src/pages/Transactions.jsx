import { useEffect, useState } from "react";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Transactions = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchTransactions = async () => {
    try {
      const data = await apiClient.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error("❌ Error fetching transactions:", err);
      toast({ title: "Failed to load transactions", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      if (!dateRange.start || !dateRange.end) {
        toast({ title: "Please select both start and end dates", variant: "destructive" });
        return;
      }

      const blob = await apiClient.exportTransactions(dateRange.start, dateRange.end);
const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `transactions_${dateRange.start}_to_${dateRange.end}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "✅ Exported successfully" });
    } catch (err) {
      console.error("❌ Export failed:", err);
      toast({ title: "Failed to export transactions", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
            <Button onClick={handleExport}>📄 Export to Excel</Button>
          </div>
        </div>

        <div className="grid gap-4">
          {transactions.map((t) => (
            <Card key={t._id}>
              <CardHeader>
                <CardTitle>
                  {t.productId?.name || "Unknown Product"} — {t.quantity} units
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <b>From:</b> {t.from?.role || "-"} → <b>To:</b> {t.to?.role || "-"}
                </p>
                <p>
                  <b>Initiated By:</b> {t.initiatedBy?.name || "-"} | <b>Received By:</b>{" "}
                  {t.receivedBy?.name || "-"}
                </p>
                <p>
                  <b>Status:</b> {t.status}
                </p>
                <p className="text-muted-foreground">
                  {new Date(t.date).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Transactions;
