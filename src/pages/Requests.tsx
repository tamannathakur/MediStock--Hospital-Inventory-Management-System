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
  _id: string;
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
        if (!profile?._id) {
           console.warn("⚠️ [Requests] Profile is null → redirecting to /auth");
          navigate('/auth');
          return;
        }
        setUserId(profile._id);
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

  const handleMarkReceived = async (id) => {
  try {
    await apiClient.markRequestReceived(id);
    toast({ title: "✅ Items received successfully" });
    fetchRequests();
  } catch (err) {
    console.error("❌ Error receiving items:", err);
    toast({ title: "Error receiving items", variant: "destructive" });
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
     + await apiClient.createRequest({ product: formData.product_id, quantity: parseInt(formData.quantity),
      reason: formData.notes,});
      toast({ title: 'Request created successfully' });
      setIsDialogOpen(false);
      fetchRequests();
      setFormData({ product_id: '', quantity: '', notes: '', request_level: 'department', department_id: '' });
    } catch (err) {
      toast({ title: 'Error creating request', reason: (err as Error).message || 'Failed', variant: 'destructive' });
    }
  };

 const handleApprove = async (id: string) => {
  try {
    await apiClient.updateRequestStatus(id, userRole);
    toast({ title: "✅ Request approved" });
    fetchRequests();
  } catch (err) {
    console.error("❌ Approval failed:", err);
    toast({ title: "Error approving request", variant: "destructive" });
  }
};


  const handleReject = async (id: string) => {
  try {
    await apiClient.rejectRequest(id, userRole);
    toast({ title: "❌ Request rejected" });
    fetchRequests();
  } catch (err) {
    console.error("❌ Reject failed:", err);
    toast({ title: "Error rejecting request", variant: "destructive" });
  }
};

const handleApproveInventory = async (id: string) => {
  try {
    await apiClient.approveInventoryRequest(id); // call backend route for inventory staff approval
    toast({ title: "✅ Request approved and sent by inventory staff" });
    fetchRequests();
  } catch (err) {
    console.error("❌ Inventory approval failed:", err);
    toast({ title: "Error approving request", variant: "destructive" });
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
            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Quantity</Label>
      <Input
        type="number"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
      />
    </div>

    <div>
      <Label>Notes</Label>
      <Textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />
    </div>

    <Button onClick={handleCreateRequest} className="w-full">
      Create Request
    </Button>
  </div>
</DialogContent>

          </Dialog>
        </div>

        <div className="grid gap-4">
          {requests.map((req) => (
            
            <Card key={req._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
{products.find(p => p._id === req.product_id)?.name || req.product?.name || "Unknown Product"}

                  </CardTitle>
                  <Badge variant={getStatusColor(req.status)}>{req.status}</Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Quantity:</span> {req.quantity}</p>
                  <p className="text-sm"><span className="font-medium">Level:</span> {req.request_level}</p>
                  {req.notes && <p className="text-sm text-muted-foreground">{req.notes}</p>}
                  {/* Sister-In-Charge Approves Nurse Requests */}
{/* 🩺 Sister-In-Charge Actions */}
{userRole?.toLowerCase() === "sister_incharge" && (
  <>
    {/* 🔹 Approve/Reject Nurse Requests */}
    {req.status?.toLowerCase().trim() === "pending_sister_incharge" && (
      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={() => handleApprove(req._id)}>
          <CheckCircle className="mr-2 h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleReject(req._id)}>
          <XCircle className="mr-2 h-4 w-4" /> Reject
        </Button>
      </div>
    )}

    {/* 🔹 Mark as Received (after Inventory sends it) */}
    {req.status?.toLowerCase().trim() === "approved_and_sent" && (
      <div className="mt-4">
        <Button
          size="sm"
          onClick={() => {
            handleMarkReceived(req._id);
          }}
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Mark as Received
        </Button>
      </div>
    )}
  </>
)}


{userRole === "inventory_staff" && req.status === "pending_inventory_approval" && (
  <button onClick={() => handleApproveInventory(req._id)}>Approve & Send</button>
)}


{/* HOD Approves Sister-In-Charge Requests */}
{userRole === "hod" && req.status === "pending_hod" && (
  <div className="flex gap-2 mt-4">
    <Button size="sm" onClick={() => handleApprove(req._id)}>
      <CheckCircle className="mr-2 h-4 w-4" />
      Approve
    </Button>
    <Button size="sm" variant="destructive" onClick={() => handleReject(req._id)}>
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
