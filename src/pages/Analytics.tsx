import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp, Package, AlertTriangle } from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRequests: 0,
    pendingRequests: 0,
    openComplaints: 0,
    recentTransactions: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const u = apiClient.getCurrentUserFromToken();
      if (!u?.id) {
        navigate('/auth');
        return;
      }
      setUserRole(u.role || '');
      if (u.role !== 'hod') {
        navigate('/dashboard');
        return;
      }

      await fetchStats();
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const data = await apiClient.getDashboardStats();
      setStats({
        totalProducts: data.totalProducts || 0,
        totalRequests: data.pendingRequests ? data.pendingRequests + 0 : 0, // backend returns totalProducts,pendingRequests,openComplaints,recentActivity
        pendingRequests: data.pendingRequests || 0,
        openComplaints: data.openComplaints || 0,
        recentTransactions: data.recentActivity || 0,
      });
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  if (loading) return <Layout userRole={userRole}><div>Loading...</div></Layout>;

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Hospital-wide inventory insights</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">of {stats.totalRequests} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openComplaints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentTransactions}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
