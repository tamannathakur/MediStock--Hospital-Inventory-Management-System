import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Requests from "./pages/Requests";
import Complaints from "./pages/Complaints";
import CentralStock from "./pages/CentralStock";
import Autoclaves from "./pages/Autoclaves";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./pages/ProtectedRoute";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
          />
          <Route path="/products" element={<Products />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/central-stock" element={<CentralStock />} />
          <Route path="/autoclaves" element={<Autoclaves />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
