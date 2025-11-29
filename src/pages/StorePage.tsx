import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import apiClient from "@/integrations/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Eye, FileText } from "lucide-react";

const MAX_ITEMS = 10;

// Helper to resize and compress images before upload
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Max dimensions (e.g., 800px) to keep size low
        const MAX_DIMENSION = 800;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 70% quality
        resolve(canvas.toDataURL("image/jpeg", 0.7)); 
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const StorePage = () => {
  const { toast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  // Stores base64 strings of the uploaded images mapped by order ID
  const [billFiles, setBillFiles] = useState<{ [key: string]: string }>({});
  
  const [orderItems, setOrderItems] = useState([
    { productName: "", quantity: "", vendorName: "", unitPrice: "", etaHours: "" },
  ]);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.listStoreOrders();
      setOrders(data.filter((o) => o.status !== "received"));
      setLogs(data.filter((o) => o.status === "received"));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddItem = () => {
    if (orderItems.length >= MAX_ITEMS) {
      toast({
        title: "Limit Reached",
        description: "You can only order up to 10 products at once.",
        variant: "destructive",
      });
      return;
    }
    setOrderItems([
      ...orderItems,
      { productName: "", quantity: "", vendorName: "", unitPrice: "", etaHours: "" },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    setOrderItems(updated);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.some((i) => !i.productName || !i.quantity || !i.vendorName)) {
      toast({
        title: "Missing Fields",
        description: "Each product must include name, quantity, and vendor.",
        variant: "destructive",
      });
      return;
    }

    try {
      // send as one combined order (batch)
      await apiClient.createStoreOrderBatch(orderItems);
      toast({ title: "✅ Vendor order placed successfully" });
      setOrderItems([{ productName: "", quantity: "", vendorName: "", unitPrice: "", etaHours: "" }]);
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Convert uploaded file to Base64 string with Compression
  const handleFileChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file);
        setBillFiles((prev) => ({ ...prev, [id]: resizedImage }));
        toast({ title: "Bill Uploaded", description: "Image compressed and attached successfully." });
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
      }
    }
  };

  const handleMarkReceived = async (id: string) => {
    if (!billFiles[id]) {
      toast({ title: "Bill Required", description: "Please upload a bill photo before marking as received.", variant: "destructive" });
      return;
    }

    try {
      await apiClient.markStoreOrderReceived(id, billFiles[id]);
      toast({ title: "✅ Marked as received" });
      // Clear the file from state after success
      setBillFiles((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">🏬 Store Management</h1>
        <p className="text-muted-foreground">
          Manage vendor orders for items not available in hospital inventory.
        </p>

        {/* ADD ORDER BUTTON + MODAL */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white hover:bg-primary/80">
              ➕ Add Vendor Order
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Multi-Product Vendor Order</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="grid md:grid-cols-5 gap-3 border rounded-lg p-3 bg-muted/20"
                >
                  <Input
                    placeholder="Product Name"
                    value={item.productName}
                    onChange={(e) => handleChange(index, "productName", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                  />
                  <Input
                    placeholder="Vendor Name"
                    value={item.vendorName}
                    onChange={(e) => handleChange(index, "vendorName", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="ETA (Hours)"
                    value={item.etaHours}
                    onChange={(e) => handleChange(index, "etaHours", e.target.value)}
                  />
                  {orderItems.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleAddItem} disabled={orderItems.length >= MAX_ITEMS}>
                  ➕ Add Another Product ({orderItems.length}/{MAX_ITEMS})
                </Button>
                <Button onClick={handleSubmitOrder} className="bg-green-600 hover:bg-green-700 text-white">
                  🚀 Submit Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ACTIVE ORDERS */}
        <Card>
          <CardHeader>
            <CardTitle>📦 Active Vendor Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 && <p>No active orders.</p>}
            {orders.map((order) => (
              <div
                key={order._id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center border rounded-lg p-4"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{order.productName}</p>
                  <p className="text-sm text-slate-600">Vendor: {order.vendorName}</p>
                  <p className="text-sm text-slate-600">Quantity: {order.quantity} | Unit Price: ₹{order.unitPrice}</p>
                  <p className="text-sm text-slate-600">Total: ₹{order.totalCost || order.quantity * order.unitPrice}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        ETA: {Number(order.etaHours) > 0 ? `${order.etaHours} hrs` : "N/A"}
                     </span>
                     <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded uppercase">
                        {order.status}
                     </span>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-col gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                     <div className="relative">
                        <Input
                          id={`file-${order._id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(order._id, e)}
                        />
                        <label 
                           htmlFor={`file-${order._id}`} 
                           className={`flex items-center justify-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm font-medium transition-colors ${billFiles[order._id] ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                           <Upload className="w-4 h-4" />
                           {billFiles[order._id] ? "Bill Uploaded" : "Upload Bill"}
                        </label>
                     </div>
                     {billFiles[order._id] && (
                        <Dialog>
                           <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                 <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                           </DialogTrigger>
                           <DialogContent className="max-w-md">
                              <DialogHeader>
                                 <DialogTitle>Bill Preview</DialogTitle>
                              </DialogHeader>
                              <img src={billFiles[order._id]} alt="Bill Preview" className="w-full rounded-lg border" />
                           </DialogContent>
                        </Dialog>
                     )}
                  </div>
                  <Button 
                     onClick={() => handleMarkReceived(order._id)} 
                     disabled={!billFiles[order._id]}
                     className={billFiles[order._id] ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                     Mark as Received
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RECEIVED LOGS */}
        <Card>
          <CardHeader>
            <CardTitle>🧾 Vendor Transaction Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-gray-500">No completed transactions.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-semibold">{log.productName}</p>
                       <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">
                          ✅ Received
                       </span>
                    </div>
                    <p className="text-sm text-slate-600">Vendor: {log.vendorName}</p>
                    <p className="text-sm text-slate-600">Qty: {log.quantity} • Cost: ₹{log.totalCost}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                     {log.billFile && log.billFile.startsWith("data:image") ? (
                        <Dialog>
                           <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-2">
                                 <FileText className="w-4 h-4" /> View Bill
                              </Button>
                           </DialogTrigger>
                           <DialogContent className="max-w-lg">
                              <DialogHeader>
                                 <DialogTitle>Stored Bill</DialogTitle>
                              </DialogHeader>
                              <div className="mt-2">
                                 <img src={log.billFile} alt="Stored Bill" className="w-full h-auto rounded-lg border shadow-sm" />
                              </div>
                           </DialogContent>
                        </Dialog>
                     ) : (
                        <span className="text-xs text-slate-400 italic">No bill image</span>
                     )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StorePage;