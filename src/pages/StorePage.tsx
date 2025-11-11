import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import apiClient from "@/integrations/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MAX_ITEMS = 10;

const StorePage = () => {
  const { toast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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

  const handleBillChange = (id: string, value: string) => {
    setBillFiles((prev) => ({ ...prev, [id]: value }));
  };

  const handleMarkReceived = async (id: string) => {
    try {
      await apiClient.markStoreOrderReceived(id, billFiles[id]);
      toast({ title: "✅ Marked as received" });
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
                <div>
                  <p className="font-semibold text-lg">{order.productName}</p>
                  <p>Vendor: {order.vendorName}</p>
                  <p>Quantity: {order.quantity}</p>
                  <p>Unit Price: ₹{order.unitPrice}</p>
                  <p>Total: ₹{order.totalCost || order.quantity * order.unitPrice}</p>
                  <p>ETA: {order.etaHours ? `${order.etaHours} hrs` : "N/A"}</p>
                  <p>Status: <span className="text-blue-600">{order.status}</span></p>
                </div>
                <div className="mt-3 md:mt-0 flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder="Enter bill reference"
                    value={billFiles[order._id] || ""}
                    onChange={(e) => handleBillChange(order._id, e.target.value)}
                  />
                  <Button onClick={() => handleMarkReceived(order._id)}>Mark as Received</Button>
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
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{log.productName}</p>
                    <p>Vendor: {log.vendorName}</p>
                    <p>Quantity: {log.quantity}</p>
                    <p>Total Cost: ₹{log.totalCost}</p>
                    <p>Bill: {log.billFile || "N/A"}</p>
                    <p className="text-green-600">✅ Received</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.updatedAt).toLocaleString()}
                  </p>
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
