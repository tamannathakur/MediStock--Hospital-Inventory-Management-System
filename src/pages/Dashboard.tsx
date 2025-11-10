import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, AlertCircle, Activity, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


interface DashboardStats {
  totalProducts: number;
  pendingRequests: number;
  openComplaints: number;
  recentActivity: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  console.log("✅ Dashboard rendered!");
  const [userRole, setUserRole] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    pendingRequests: 0,
    openComplaints: 0,
    recentActivity: 0,
  });
  useEffect(() => {
  console.log("🧭 Dashboard useEffect auth check running");
}, []);

  useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log("🧩 Token in Dashboard:", token);

    // If no token, send to auth immediately
    if (!token) {
      console.log("🚫 No token found — redirecting to /auth");
      navigate('/auth');
      return;
    }

    try {
      const profile = await apiClient.getProfile();
      console.log("✅ Profile fetched:", profile);

      if (!profile?._id && !profile?.id) {
        console.log("🚫 Invalid profile response — redirecting to /auth");
        navigate('/auth');
        return;
      }

      setUserRole(profile.role || '');
      await fetchStats(profile.role || '');
    } catch (err) {
      console.error("❌ Auth check failed:", err);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  // Add a slight delay so token can settle after login
  setTimeout(checkAuth, 200);
}, [navigate]);


  const fetchStats = async (role: string) => {
    try {
      const data = await apiClient.getDashboardStats();
      setStats({
        totalProducts: data.totalProducts || 0,
        pendingRequests: data.pendingRequests || 0,
        openComplaints: data.openComplaints || 0,
        recentActivity: data.recentActivity || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getRoleGreeting = () => {
    switch (userRole) {
      case "inventory_staff":
        return "Central Store Dashboard";
      case "sister_incharge":
        return "Department Dashboard";
      case "hod":
        return "Administrative Dashboard";
      case "nurse":
        return "My Dashboard";
      default:
        return "Dashboard";
    }
  };

  if (loading) {
    return (
      <Layout userRole={userRole}>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      description: "Products in inventory",
      color: "text-primary",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: Clock,
      description: "Awaiting approval",
      color: "text-warning",
    },
    {
      title: "Open Complaints",
      value: stats.openComplaints,
      icon: AlertCircle,
      description: "Require attention",
      color: "text-destructive",
    },
    {
      title: "Recent Activity",
      value: stats.recentActivity,
      icon: Activity,
      description: "Last 24 hours",
      color: "text-accent",
    },
  ];

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getRoleGreeting()}</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions based on Role */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userRole === "inventory_staff" && (
                <>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/products")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Manage Products
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/requests")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Review Requests
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/central-stock")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Stock Overview
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </>
              )}
              {userRole === "sister_incharge" && (
                <>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/requests")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Review Requests
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/department-stock")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Department Stock
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/consumables")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Consumables
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </>
              )}
             {userRole === "nurse" && (
  <>
    <Card
      className="cursor-pointer hover:bg-secondary/50 transition-colors"
      onClick={() => navigate("/products")}
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Browse Products
        </CardTitle>
      </CardHeader>
    </Card>

    <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/almirah")}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          My Almirah
        </CardTitle>
      </CardHeader>
    </Card>

    <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/requests")}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          New Request
        </CardTitle>
      </CardHeader>
    </Card>

    <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/autoclaves")}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Autoclaves
        </CardTitle>
      </CardHeader>
    </Card>
  </>
)}

              {userRole === "hod" && (
                <>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/requests")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Approvals
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/analytics")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/complaints")}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Complaints
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
