import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PackageMinus } from "lucide-react";

interface AlmirahItem {
  productId: string;
  name: string;
  category?: string;
  quantity: number;
  expiry?: string;
}

const MyAlmirah = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [almirahItems, setAlmirahItems] = useState<AlmirahItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profile = await apiClient.getProfile();
        if (!profile?._id) {
          navigate("/auth");
          return;
        }
        setUserRole(profile.role || "");
        await fetchAlmirahItems();
      } catch (err) {
        console.error("❌ [MyAlmirah] Auth error:", err);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const fetchAlmirahItems = async () => {
    try {
      console.log("📦 [MyAlmirah] Fetching almirah items...");
      const data = await apiClient.listAlmirah();
      console.log("📥 [MyAlmirah] API Response:", data);

      if (data && Array.isArray(data.items)) {
        setAlmirahItems(data.items);
        console.log(`✅ [MyAlmirah] Loaded ${data.items.length} items`);
      } else {
        console.warn("⚠️ [MyAlmirah] Unexpected response format:", data);
      }
    } catch (err) {
      console.error("❌ [MyAlmirah] Failed to fetch items:", err);
    }
  };

  const handleUseProduct = async (productId: string, currentQty: number) => {
    const qtyUsedStr = prompt("Enter quantity to use:");
    const qtyUsed = qtyUsedStr ? parseInt(qtyUsedStr) : 0;
    if (!qtyUsed || qtyUsed <= 0) return;

    if (qtyUsed > currentQty) {
      toast({
        title: "Error",
        description: "Cannot use more than available",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.useAlmirahItem(productId, qtyUsed); // ✅ Correct API call
      toast({
        title: "✅ Product Used",
        description: `Used ${qtyUsed} unit(s) successfully`,
      });
      await fetchAlmirahItems(); // Refresh items
    } catch (err) {
      console.error("❌ [MyAlmirah] Error using product:", err);
      toast({
        title: "Error using product",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout userRole={userRole}>
        <div className="text-center mt-10">Loading your almirah...</div>
      </Layout>
    );
  }

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Almirah</h1>
            <p className="text-muted-foreground">
              View and manage your consumable items
            </p>
          </div>
        </div>

        {almirahItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              No items in your almirah yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {almirahItems.map((item) => (
              <Card key={item.productId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                    {item.category && <Badge variant="secondary">{item.category}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    Quantity: <span className="font-bold">{item.quantity}</span>
                  </p>
                  {item.expiry && (
                    <p className="text-xs text-muted-foreground">
                      Expiry: {new Date(item.expiry).toLocaleDateString()}
                    </p>
                  )}
                  <Button
                    onClick={() => handleUseProduct(item.productId, item.quantity)}
                    className="w-full mt-2"
                    variant="default"
                  >
                    <PackageMinus className="mr-2 h-4 w-4" /> Use Product
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyAlmirah;
