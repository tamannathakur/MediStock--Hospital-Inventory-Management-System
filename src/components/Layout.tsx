import { ReactNode, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Package, 
  Users, 
  Building2, 
  FileText, 
  AlertCircle, 
  LogOut,
  Menu,
  Activity,
  User,
  LayoutDashboard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
  userRole?: string;
}

const Layout = ({ children, userRole }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [localRole, setLocalRole] = useState<string | undefined>(userRole);
  console.log("📦 Layout rendered, current path:", window.location.pathname);
  // derive nav items from the locally-known role (prop can seed it)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // apiClient.getProfile() should call GET /api/auth/me and return { id, name, email, role, ... }
        const profile = await apiClient.getProfile?.();
        if (profile) {
          if (profile.name) setUserName(profile.name);
          if (profile.role) setLocalRole(profile.role);
        }
      } catch (err) {
        // silent: no profile -> keep default name
        console.error('Failed to fetch profile', err);
      }
    };

    fetchUserProfile();
  }, []);

    const handleLogout = async () => {
    try {
      // clears token locally
      apiClient.logout();
      // optionally you can also call a server-side invalidate endpoint if you add one
      navigate("/auth");
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleBasedNav = (role?: string) => {
    const commonNav = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Package, label: "Products", path: "/products" },
      { icon: FileText, label: "Requests", path: "/requests" },
      { icon: AlertCircle, label: "Complaints", path: "/complaints" },
    ];
    switch (role) {
      case "inventory_staff":
        return [
          ...commonNav,
          { icon: Building2, label: "Central Stock", path: "/central-stock" },
          { icon: Users, label: "Departments", path: "/departments" },
          { icon: Activity, label: "Transactions", path: "/transactions" },
        ];
      case "sister_incharge":
        return [
          ...commonNav,
          { icon: Building2, label: "Department Stock", path: "/department-stock" },
          { icon: Package, label: "Consumables", path: "/consumables" },
          { icon: Activity, label: "Autoclaves", path: "/autoclaves" },
        ];
      case "hod":
        return [
          ...commonNav,
          { icon: Users, label: "Departments", path: "/departments" },
          { icon: Activity, label: "Analytics", path: "/analytics" },
          { icon: Activity, label: "Transactions", path: "/transactions" },
        ];
      case "nurse":
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
          { icon: Package, label: "My Almirah", path: "/almirah" },
          { icon: LayoutDashboard, label: "Products", path: "/products" },
          { icon: Activity, label: "Autoclaves", path: "/autoclaves" },
          { icon: FileText, label: "Requests", path: "/requests" },
          { icon: AlertCircle, label: "Complaints", path: "/complaints" },
        ];
      default:
        return commonNav;
    }
  };

  const navItems = getRoleBasedNav(localRole);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-2">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">HIMS</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className="gap-2"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{userName || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{userName}</span>
                    <span className="text-xs font-normal text-muted-foreground capitalize">
                      {userRole?.replace("_", " ")}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;
