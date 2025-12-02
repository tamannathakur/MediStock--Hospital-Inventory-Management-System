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
  product: string;
  quantity: number;
  status: string;
  request_level: string;
  department_id: string;
  reason: string;
  createdAt: string;
}

const Requests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);

const [storeItems, setStoreItems] = useState([
  { product: "", quantity: "" }
]);

  const [userId, setUserId] = useState<string>("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product: "",
    product_name: "",
    quantity: "",
    reason: "",
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

  const handleStoreItemChange = (index, field, value) => {
  const updated = [...storeItems];
  updated[index][field] = value;
  setStoreItems(updated);
};

const addStoreItemRow = () => {
  setStoreItems([...storeItems, { product: "", quantity: "" }]);
};

const removeStoreItemRow = (index) => {
  const updated = storeItems.filter((_, i) => i !== index);
  setStoreItems(updated);
};

const handleOCRUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log("📤 Uploading to OCR:", file.name);

  const fd = new FormData();
  fd.append("image", file);

  try {
    const res = await fetch("http://localhost:5000/api/ocr", {
      method: "POST",
      body: fd
    });

    const text = await res.text();
    console.log("📩 Raw OCR response text:", text);

    if (!res.ok) throw new Error(text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Could NOT parse OCR JSON:", err);
      throw new Error("Invalid JSON from backend");
    }

    console.log("🧾 Parsed JSON:", data);
    const texts = data.texts || [];

    // Convert texts → form items
    const parsedItems = [];
    for (let i = 0; i < texts.length; i += 2) {
      parsedItems.push({
        product: texts[i] ?? "",
        quantity: texts[i + 1] ?? ""
      });
    }

    console.log("📝 Parsed Items:", parsedItems);

    setStoreItems(parsedItems);
    setIsStoreDialogOpen(true);

  } catch (err) {
    console.error("🚨 OCR Upload Failed:", err);
    toast({ title: "OCR failed", variant: "destructive" });
  }
};




const handleSubmitStoreRequest = async () => {
  try {
    await apiClient.createStoreRequest({
      items: storeItems.map((i) => ({
        product: i.product,
        quantity: parseInt(i.quantity)
      }))
    });

    toast({ title: "🛒 Store request created successfully" });
    setIsStoreDialogOpen(false);
    setStoreItems([{ product: "", quantity: "" }]);
    fetchRequests();
  } catch (err) {
    console.error("Store request failed:", err);
    toast({ title: "Error creating store request", variant: "destructive" });
  }
};

  // const fetchRequests = async () => {
  //   try {
  //     const data = await apiClient.listRequests();
  //     if (Array.isArray(data)) setRequests(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  //   } catch (err) {
  //     console.error('Failed to fetch requests', err);
  //   }
  // };

  const fetchRequests = async () => {
  try {
    const data = await apiClient.listRequests();

    if (Array.isArray(data)) {
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRequests(sorted);
    } else {
      console.warn("⚠️ listRequests did not return an array: ", data);
      setRequests([]);
    }
  } catch (err) {
    console.error("🚨 fetchRequests ERROR:", err);
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
     + await apiClient.createRequest({ product: formData.product, quantity: parseInt(formData.quantity)});
      toast({ title: 'Request created successfully' });
      setIsDialogOpen(false);
      fetchRequests();
      setFormData({product: '', quantity: '', reason: '', request_level: 'department', department_id: '' });
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

// const handleApproveInventory = async (id: string) => {
//   try {
//     await apiClient.approveInventoryRequest(id); // call backend route for inventory staff approval
//     toast({ title: "✅ Request approved and sent by inventory staff" });
//     fetchRequests();
//   } catch (err) {
//     console.error("❌ Inventory approval failed:", err);
//     toast({ title: "Error approving request", variant: "destructive" });
//   }
// };
const handleApproveInventory = async (id: string, isStoreItem: boolean) => {
  try {
    if (isStoreItem) {
      await apiClient.approveStoreRequest(id); // Vendor flow
      toast({ title: "🚚 Dispatched from store" });
    } else {
      await apiClient.approveInventoryRequest(id); // Central store flow
      toast({ title: "📦 Request fulfilled from central store" });
    }

    fetchRequests();
  } catch (err) {
    console.error("❌ Inventory approval failed:", err);
    toast({ title: "Approval failed", variant: "destructive" });
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

  <div className="flex gap-3">

    
{["nurse", "sister_incharge"].includes(userRole?.toLowerCase()) && (
    <Button
      variant="default"
      onClick={() => document.getElementById("ocr-upload").click()}
    >
      Upload Items 📷
    </Button>
)}

<input
  id="ocr-upload"
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleOCRUpload}
/>

    {/* STORE REQUEST (inventory staff) */}
    <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Request Items</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Store Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {storeItems.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3">
              <div>
                <Label>Product</Label>
                <Input
  placeholder="Type product name (or select existing)"
  value={item.product}
  onChange={(e) =>
    handleStoreItemChange(index, "product", e.target.value)
  }
  list="product-list"
/>

                 <datalist id="product-list">
    {products.map((p) => (
      <option key={p._id} value={p.name} />
    ))}
  </datalist>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleStoreItemChange(index, "quantity", e.target.value)
                  }
                />
              </div>

              {storeItems.length > 1 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => removeStoreItemRow(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addStoreItemRow} className="w-full">
            + Add Another Product
          </Button>

          <Button className="w-full" onClick={handleSubmitStoreRequest}>
            Submit Store Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</div>

       <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
  {/* {requests
  .flatMap((req) => {
  // STORE REQUEST
  if (req.requestType === "store_request" && Array.isArray(req.items)) {
    return req.items.map((item, index) => ({
      frontendId: `${req._id}_${index}`,
      realId: req._id,
      productName: item.productName,
      quantity: item.quantity,
      status: req.status,
      vendorETA: req.vendorETA,
      vendorStatus: req.vendorStatus,
      vendorETAExpiresAt: req.vendorETAExpiresAt,
      isStoreRequest: true
    }));
  }

  // NORMAL CENTRAL REQUEST
  const product = products.find(p => p._id === req.product);
  return [{
    frontendId: req._id,
    realId: req._id,
    productName: product?.name ?? "Unknown Product",
    quantity: req.quantity,
    status: req.status,
    isStoreRequest: false
  }];
 })

  .map((req) => {

    // REPLACEMENT ✔ */}
    {requests
  .flatMap((req) => {
  // STORE REQUESTS
  if (req.requestType === "store_request" && Array.isArray(req.items)) {
    return req.items.map((item, index) => ({
      frontendId: `${req._id}_${index}`,
      realId: req._id,
      productName: item.productName ?? "Unknown",
      quantity: item.quantity,
      status: req.status,
      vendorETA: req.vendorETA,
      vendorETAExpiresAt: req.vendorETAExpiresAt,
      vendorStatus: req.vendorStatus,
      createdAt: req.createdAt,
      isStoreRequest: true,
    }));
  }

  // NORMAL REQUESTS
  return [{
    frontendId: req._id,
    realId: req._id,
    productName: req.product?.name ?? "Unknown Product",
    quantity: req.quantity,
    status: req.status,
    createdAt: req.createdAt,
    vendorETA: req.vendorETA,
    vendorETAExpiresAt: req.vendorETAExpiresAt,
    vendorStatus: req.vendorStatus,
    isStoreRequest: false,
  }];
})

  .map((req) => {
    const productName = req.productName;
    const status = req.status?.toLowerCase().trim();


    const statusStyles: Record<string, string> = {
  pending_sister_incharge: "bg-yellow-50 text-yellow-800 border border-yellow-300",
  pending_hod: "bg-blue-50 text-blue-800 border border-blue-300",
  pending_inventory_approval: "bg-purple-50 text-purple-800 border border-purple-300",
  approved_and_sent: "bg-green-50 text-green-800 border border-green-300",
  fulfilled: "bg-emerald-50 text-emerald-800 border border-emerald-300",
  awaiting_vendor: "bg-orange-50 text-orange-800 border border-orange-300",
  received_from_vendor: "bg-teal-50 text-teal-800 border border-teal-300",
  rejected: "bg-red-50 text-red-800 border border-red-300",
};

    return (
      <Card
        key={req.frontendId}
        className="shadow-md hover:shadow-xl transition-all duration-300 rounded-xl border border-gray-200 hover:border-gray-300"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 tracking-wide">
              {productName}
            </CardTitle>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                statusStyles[status] || "bg-gray-100 text-gray-800 border border-gray-300"
              }`}
            >
              {req.status.replace(/_/g, " ")}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-gray-700">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="font-medium text-gray-900">Quantity: </span>
              {req.quantity}
            </p>
            <p className="col-span-2">
              <span className="font-medium text-gray-900">Created: </span>
              {new Date(req.createdAt).toLocaleString()}
            </p>
          </div>
          {/* Vendor ETA Info */}
{req.vendorETA && (
  <p className="text-sm text-orange-700 font-medium">
    ETA: {req.vendorETA}
  </p>
)}

{req.vendorETAExpiresAt && (
  <p className="text-sm text-orange-600">
    Time left: {
      Math.max(
        0,
        Math.floor((new Date(req.vendorETAExpiresAt).getTime() - Date.now()) / 3600000)
      )
    } hours
  </p>
)}
{req.vendorStatus && (
  <p className="text-sm text-gray-700">
    Vendor Status: <b>{req.vendorStatus.replace(/_/g, " ")}</b>
  </p>
)}

          {req.reason && (
            <div className="border-l-4 border-gray-300 pl-3 mt-2">
              <p className="text-sm italic text-gray-600">“{req.reason}”</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">

            {/* Inventory Staff: Vendor Delivered */}
{/* 🧰 Inventory Staff: Assign ETA (only once) */}
{userRole === "inventory_staff" &&
 req.status === "awaiting_vendor" &&
 !req.vendorETA && (
  <Button
    size="sm"
    className="bg-orange-600 hover:bg-orange-700 text-white px-5"
    onClick={async () => {
      const eta = prompt("Enter ETA in hours:");
      if (!eta) return;

      try {
        await apiClient.setVendorETA(req.realId, parseInt(eta));
        toast({ title: "ETA updated successfully" });
        fetchRequests();
      } catch (err) {
        console.error("ETA error:", err);
        toast({ title: "Error updating ETA", variant: "destructive" });
      }
    }}
  >
    Assign ETA & Process
  </Button>
)}

{userRole === "inventory_staff" &&
  status === "awaiting_vendor" &&
  req.vendorETA && (
    <Button
      size="sm"
      className="bg-teal-600 hover:bg-teal-700 text-white px-5"
      onClick={async () => {
        try {
          await apiClient.vendorReceived(req.realId);
          toast({ title: "📦 Vendor delivery received" });
          fetchRequests();
        } catch (err) {
          console.error("Error marking vendor delivered", err);
          toast({ title: "Vendor update failed", variant: "destructive" });
        }
      }}
    >
      Vendor Delivered
    </Button>
)}


            {/* 👩‍⚕️ Sister-In-Charge Actions */}
            {userRole?.toLowerCase() === "sister_incharge" && (
              <>
                {status === "pending_sister_incharge" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(req.realId)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(req.realId)}
                      className="px-4"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}

                {status === "approved_and_sent" && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkReceived(req.realId)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Received
                  </Button>
                )}
              </>
            )}

            {/* 🧰 Inventory Staff Actions */}
            {userRole === "inventory_staff" &&
              status === "pending_inventory_approval" && (
                <Button
                  size="sm"
                  onClick={() => handleApproveInventory(req.realId,  req.isStoreItem)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Send
                </Button>
              )}

            {/* 🏢 HOD Actions */}
            {userRole === "hod" && status === "pending_hod" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(req.realId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(req.realId)}
                  className="px-4"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  })}
</div>

      </div>
    </Layout>
  );
};

export default Requests;
