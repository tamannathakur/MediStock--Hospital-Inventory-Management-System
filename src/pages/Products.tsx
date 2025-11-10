import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  category: string | null;
  batch_no: string | null;
  expiry_date: string | null;
  vendor: string | null;
  description: string | null;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  console.log("🧭 Products page rendered! Path:", window.location.pathname);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [newProduct, setNewProduct] = useState({
  name: "",
  category: "",
  batchNo: "",
  expiryDate: "",
  vendor: "",
  pricePerUnit: "",
  totalQuantity: "",
});
  useEffect(() => {
    console.log("🚀 useEffect triggered for Products");
    const checkAuth = async () => {
      try {
        const profile = await apiClient.getProfile?.();
        console.log("👤 /auth/me profile:", profile);
        if (!profile || !profile._id) {
          navigate('/auth');
          return;
        }
        setUserRole(profile.role || '');
        console.log("✅ User role set to:", profile.role);
        await fetchProducts();
      } catch (err) {
        navigate('/auth');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.listProducts();
      if (Array.isArray(data)) setProducts(data as Product[]);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    console.log("🆕 Adding product:", newProduct);
    await apiClient.addProduct(newProduct);
    toast({
      title: "✅ Product Added",
      description: `${newProduct.name} added successfully!`,
    });
    setIsDialogOpen(false);

    // Clear form
    setNewProduct({
      name: "",
      category: "",
      batchNo: "",
      expiryDate: "",
      vendor: "",
      pricePerUnit: "",
      totalQuantity: "",
    });

    // Refresh products list
    await fetchProducts();
  } catch (error: any) {
    console.error("❌ Failed to add product:", error);
    toast({
      title: "Error",
      description: "Could not add product. Please try again.",
      variant: "destructive",
    });
  }
};
const handleRequestProduct = async (productId: string) => {
  try {
    const quantity = prompt("Enter quantity to request:");
    if (!quantity) return;
    await apiClient.createRequest("defaultDept", { productId, quantity: parseInt(quantity) });
    toast({
      title: "Request Sent",
      description: "Your product request has been submitted for approval.",
    });
} catch (error: any) {
    toast({
      title: "Error",
      description: "Could not send request.",
      variant: "destructive",
    });
  }
};

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout userRole={userRole}>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Browse and manage all hospital products
            </p>
          </div>
          {(userRole === "inventory_staff") && (
            <Button onClick={() => setIsDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Add Product
</Button>

          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No products found matching your search" : "No products available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.category && (
                        <Badge variant="secondary" className="mt-2">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {product.batch_no && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Batch: </span>
                      <span className="font-medium">{product.batch_no}</span>
                    </div>
                  )}
                  {product.vendor && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Vendor: </span>
                      <span className="font-medium">{product.vendor}</span>
                    </div>
                  )}
                  {product.expiry_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Expires: </span>
                      <span className="font-medium">
                        {new Date(product.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {product.description}
                    </p>
                  )}
                  {(userRole === "nurse" || userRole === "sister_incharge") && (
  <Button
    onClick={() => handleRequestProduct(product.id)}
    className="w-full mt-2"
  >
    Request Product
  </Button>
)}

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Add New Product</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleAddProduct} className="space-y-4">
      {/* Basic Details */}
      {["name", "category", "batchNo", "vendor"].map((field) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
          <Input
            id={field}
            value={(newProduct as any)[field]}
            onChange={(e) => setNewProduct({ ...newProduct, [field]: e.target.value })}
            required={field === "name"}
          />
        </div>
      ))}

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label htmlFor="expiryDate">Expiry Date</Label>
        <Input
          type="date"
          id="expiryDate"
          value={newProduct.expiryDate}
          onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
        />
      </div>

      {/* Price & Quantity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pricePerUnit">Price Per Unit</Label>
          <Input
            type="number"
            id="pricePerUnit"
            value={newProduct.pricePerUnit}
            onChange={(e) => setNewProduct({ ...newProduct, pricePerUnit: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalQuantity">Total Quantity</Label>
          <Input
            type="number"
            id="totalQuantity"
            value={newProduct.totalQuantity}
            onChange={(e) => setNewProduct({ ...newProduct, totalQuantity: e.target.value })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full">
          Add Product
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

    </Layout>
  );
};

export default Products;
