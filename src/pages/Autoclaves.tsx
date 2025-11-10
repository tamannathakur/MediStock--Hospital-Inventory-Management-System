import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity } from "lucide-react";

const Autoclaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [autoclaves, setAutoclaves] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
  const checkAuth = async () => {
    try {
      // apiClient.getProfile() should call GET /api/auth/me and return { id, name, role, ... }
      const profile = await apiClient.getProfile?.();
      if (!profile?.id) {
        navigate('/auth');
        return;
      }
      setUserRole(profile.role || '');
      await Promise.all([fetchAutoclaves(), fetchItems(), fetchDepartments()]);
    } catch (err) {
      // not authenticated or error -> redirect to auth
      navigate('/auth');
      return;
    } finally {
      setLoading(false);
    }
  };

  checkAuth();
}, [navigate]);

  const fetchAutoclaves = async () => {
  try {
    const data = await apiClient.listAutoclaves();
    if (Array.isArray(data)) setAutoclaves(data);
  } catch (err) {
    console.error('Failed to fetch autoclaves', err);
  }
};

 const fetchItems = async () => {
  try {
    const data = await apiClient.listAutoclaveItems(); // implement in apiClient
    if (Array.isArray(data)) setItems(data);
  } catch (err) {
    console.error('Failed to fetch autoclave items', err);
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

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || "Unknown";
  };

  if (loading) return <Layout userRole={userRole}><div>Loading...</div></Layout>;

  return (
    <Layout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Autoclave Management</h1>
          <p className="text-muted-foreground">Track and manage sterilization equipment</p>
        </div>

        <Tabs defaultValue="equipment">
          <TabsList>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {autoclaves.map((autoclave) => (
                <Card key={autoclave.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      {autoclave.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Department:</span>{" "}
                        {getDepartmentName(autoclave.department_id)}
                      </p>
                      {autoclave.location && (
                        <p className="text-sm">
                          <span className="font-medium">Location:</span> {autoclave.location}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Items: {items.filter(i => i.autoclave_id === autoclave.id).length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant={item.status === "available" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Department:</span>{" "}
                        {getDepartmentName(item.department_id)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Usage Count:</span> {item.usage_count}
                      </p>
                      {item.last_used_date && (
                        <p className="text-sm text-muted-foreground">
                          Last used: {new Date(item.last_used_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Autoclaves;
