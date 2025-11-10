import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package } from "lucide-react";

const CentralStock = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [stock, setStock] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await apiClient.getProfile?.();
        if (!profile?.id) {
          navigate('/auth');
          return;
        }
        setUserRole(profile.role || '');
        await fetchStock();
      } catch (err) {
        navigate('/auth');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchStock = async () => {
    try {
      const stockData = await apiClient.listCentralStock();
      const productsData = await apiClient.listProducts();
      if (Array.isArray(stockData)) setStock(stockData);
      if (Array.isArray(productsData)) setProducts(productsData);
    } catch (err) {
      console.error('Failed to fetch central stock or products', err);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "Unknown";
  };

  if (loading) return <Layout userRole={userRole}><div>Loading...</div></Layout>;

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central Stock</h1>
          <p className="text-muted-foreground">Main hospital inventory storage</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stock.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {getProductName(item.product_id)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Units available</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(item.last_updated).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CentralStock;
