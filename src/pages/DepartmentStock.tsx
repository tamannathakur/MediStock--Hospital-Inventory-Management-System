import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface DepartmentItem {
  _id: string;
  productId: string;
  name: string;
  category?: string;
  vendor?: string;
  quantity: number;
  expiry?: string;
}

const DepartmentStock = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [departmentItems, setDepartmentItems] = useState<DepartmentItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profile = await apiClient.getProfile();
        if (!profile?._id) {
          navigate("/auth");
          return;
        }
        setUserRole(profile.role || "");
        await fetchDepartmentStock();
      } catch (err) {
        console.error("❌ [DepartmentStock] Auth error:", err);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const fetchDepartmentStock = async () => {
    try {
      console.log("📦 [DepartmentStock] Fetching department inventory...");
      const data = await apiClient.listDepartmentStock();
      console.log("📥 [DepartmentStock] API Response:", data);

      if (data && Array.isArray(data.items)) {
        setDepartmentItems(data.items);
        console.log(`✅ Loaded ${data.items.length} department items`);
      } else {
        console.warn("⚠️ Unexpected response format:", data);
      }
    } catch (err) {
      console.error("❌ [DepartmentStock] Failed to fetch department stock:", err);
      toast({ title: "Error fetching department stock", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Layout userRole={userRole}>
        <div className="text-center mt-10">Loading department stock...</div>
      </Layout>
    );
  }

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Department Stock</h1>
            <p className="text-muted-foreground">
              Items available in your department’s inventory
            </p>
          </div>
        </div>

        {departmentItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              No items in department stock yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departmentItems.map((item) => (
              <Card key={item._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {item.name}
                    </CardTitle>
                    {item.category && <Badge variant="secondary">{item.category}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Vendor: <span className="font-medium">{item.vendor || "N/A"}</span>
                  </p>
                  <p className="text-sm">
                    Quantity: <span className="font-bold">{item.quantity}</span>
                  </p>
                  {item.expiry && (
                    <p className="text-xs text-muted-foreground">
                      Expiry: {new Date(item.expiry).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DepartmentStock;
