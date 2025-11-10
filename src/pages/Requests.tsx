import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle } from "lucide-react";

interface Request {
  id: string;
  requested_by: string;
  product_id: string;
  quantity: number;
  status: string;
  request_level: string;
  department_id: string;
  notes: string;
  created_at: string;
}

const Requests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    notes: "",
    request_level: "department",
    department_id: "",
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
        setFormData(prev => ({ ...prev, department_id: profile.department_id || '' }));
        await Promise.all([fetchRequests(), fetchProducts(), fetchDepartments()]);
      } catch (err) {
        navigate('/auth');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchRequests = async () => {
    try {
      const data = await apiClient.listRequests();
      if (Array.isArray(data)) setRequests(data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Failed to fetch requests', err);
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

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.listDepartments();
      if (Array.isArray(data)) setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  const handleCreateRequest = async () => {
    try {
      // backend expects productId, quantity, reason; route is /departments/:id/request
      await apiClient.createRequest(formData.department_id, {
        productId: formData.product_id,
        quantity: parseInt(formData.quantity),
        reason: formData.notes,
      });
      toast({ title: 'Request created successfully' });
      setIsDialogOpen(false);
      fetchRequests();
      setFormData({ product_id: '', quantity: '', notes: '', request_level: 'department', department_id: '' });
    } catch (err) {
      toast({ title: 'Error creating request', description: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.updateRequestStatus(id, { status: 'approved', approved_by: userId });
      toast({ title: 'Request approved' });
      fetchRequests();
    } catch (err) {
      toast({ title: 'Error approving request', description: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.updateRequestStatus(id, { status: 'rejected', approved_by: userId });
      toast({ title: 'Request rejected' });
      fetchRequests();
    } catch (err) {
      toast({ title: 'Error rejecting request', description: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      case "fulfilled": return "secondary";
      default: return "outline";
    }
  };

  if (loading) return <Layout userRole={userRole}><div>Loading...</div></Layout>;

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
            <p className="text-muted-foreground">Manage product and equipment requests</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
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
                  <Label>Quantity</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div>
                  <Label>Request Level</Label>
                  <Select value={formData.request_level} onValueChange={(v) => setFormData({ ...formData, request_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="central">Central</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <Button onClick={handleCreateRequest} className="w-full">Create Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {products.find(p => p.id === req.product_id)?.name || "Unknown Product"}
                  </CardTitle>
                  <Badge variant={getStatusColor(req.status)}>{req.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Quantity:</span> {req.quantity}</p>
                  <p className="text-sm"><span className="font-medium">Level:</span> {req.request_level}</p>
                  {req.notes && <p className="text-sm text-muted-foreground">{req.notes}</p>}
                  {req.status === "pending" && (userRole === "hod" || userRole === "sister_incharge" || userRole === "inventory_staff") && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => handleApprove(req.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
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

export default Requests;
