import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertCircle } from "lucide-react";

const Complaints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    description: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await apiClient.getProfile?.();
        if (!profile?.id) {
          navigate('/auth');
          return;
        }
        setUserId(profile.id);
        setUserRole(profile.role || '');
        await Promise.all([fetchComplaints(), fetchProducts()]);
      } catch (err) {
        navigate('/auth');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchComplaints = async () => {
    try {
      const data = await apiClient.listComplaints();
      if (Array.isArray(data)) {
        // assume backend returns array sorted or include sorting params if needed
        setComplaints(data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiClient.listProducts();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleCreateComplaint = async () => {
    try {
      await apiClient.createComplaint({ ...formData, raised_by: userId });
      toast({ title: 'Complaint registered successfully' });
      setIsDialogOpen(false);
      fetchComplaints();
      setFormData({ product_id: '', description: '' });
    } catch (err) {
      toast({ title: 'Error creating complaint', description: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

  const handleResolve = async (id: string, notes: string) => {
    try {
      await apiClient.resolveComplaint(id, { resolved_by: userId, resolution_notes: notes });
      toast({ title: 'Complaint resolved' });
      fetchComplaints();
    } catch (err) {
      toast({ title: 'Error resolving complaint', description: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

  if (loading) return <Layout userRole={userRole}><div>Loading...</div></Layout>;

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
            <p className="text-muted-foreground">Register and track product defects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Complaint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Complaint</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Describe the issue..."
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
                <Button onClick={handleCreateComplaint} className="w-full">Submit Complaint</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    {products.find(p => p.id === complaint.product_id)?.name || "Unknown Product"}
                  </CardTitle>
                  <Badge variant={complaint.status === "open" ? "destructive" : "secondary"}>
                    {complaint.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{complaint.description}</p>
                  {complaint.resolution_notes && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Resolution:</p>
                      <p className="text-sm text-muted-foreground">{complaint.resolution_notes}</p>
                    </div>
                  )}
                  {complaint.status === "open" && (userRole === "hod" || userRole === "inventory_staff") && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const notes = prompt("Enter resolution notes:");
                        if (notes) handleResolve(complaint.id, notes);
                      }}
                      className="mt-4"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Complaints;
