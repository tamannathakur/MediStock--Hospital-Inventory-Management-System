import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Loader2, ArrowLeft, Lock } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<string>("nurse");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resp = await apiClient.login(loginEmail, loginPassword);

      if (resp?.token) {
        localStorage.setItem("token", resp.token);
        toast({ title: "Success", description: "Logged in successfully!" });
        navigate("/dashboard");
      } else {
        toast({ title: "Error", description: "Login failed.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      toast({
        title: "Error",
        description: "Invalid credentials or server issue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.register({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
      });
      toast({ title: 'Success', description: 'Account created! You can now log in.' });
      // Switch to login tab
      const loginTab = document.querySelector('[value="login"]') as HTMLElement;
      loginTab?.click();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Blobs (Matching Landing Page) */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-teal-50 rounded-full blur-3xl opacity-50 -z-10"></div>

      <div className="w-full max-w-md relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </button>

        <Card className="w-full bg-white/80 backdrop-blur-xl shadow-2xl border border-slate-100 rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto bg-blue-600 p-3 rounded-xl w-fit shadow-lg shadow-blue-200">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-500">
                MediStock
              </CardTitle>
              <CardDescription className="text-base text-slate-500 mt-2">
                Secure access for hospital staff
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 space-y-4 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700 font-medium">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nurse.joy@hospital.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password" className="text-slate-700 font-medium">Password</Label>
                      <a href="#" className="text-xs text-blue-600 hover:underline">Forgot?</a>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Secure Login
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4 animate-fade-in">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-700 font-medium">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Dr. John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-50 border-slate-200 focus:border-blue-500 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-700 font-medium">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@hospital.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-50 border-slate-200 focus:border-blue-500 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="bg-slate-50 border-slate-200 focus:border-blue-500 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role" className="text-slate-700 font-medium">Department Role</Label>
                    <Select value={signupRole} onValueChange={setSignupRole} disabled={loading}>
                      <SelectTrigger id="signup-role" className="bg-slate-50 border-slate-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-100 shadow-xl">
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="sister_incharge">Sister In-Charge</SelectItem>
                        <SelectItem value="inventory_staff">Inventory Staff</SelectItem>
                        <SelectItem value="hod">HOD/Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;