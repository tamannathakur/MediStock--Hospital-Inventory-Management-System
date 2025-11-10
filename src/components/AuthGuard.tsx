import { Navigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";

export default function AuthGuard({ children }: { children: JSX.Element }) {
  const user = apiClient.getCurrentUserFromToken();
  if (!user?.id) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}
