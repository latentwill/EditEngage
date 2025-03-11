import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui-extensions/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Linkedin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await signIn(email, password);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await signUp(email, password);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E6E0F5] to-[#F9F5F8] flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6E0F5] to-[#F9F5F8] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-border/50 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">E</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to EditEngage</h1>
          <p className="text-muted-foreground">
            Sign in to manage your social media content with AI assistance
          </p>
        </div>
        
        <Tabs defaultValue="signin" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email-signin">Email</Label>
                <div className="relative mt-1">
                  <Input 
                    id="email-signin" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Mail 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password-signin">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative mt-1">
                  <Input 
                    id="password-signin" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                  />
                </div>
              </div>
              
              <Button type="submit" variant="primary" className="w-full">
                Sign in
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 72 72" width="18" fill="#0A66C2">
                  <path d="M64,0H8C3.6,0,0,3.6,0,8v56c0,4.4,3.6,8,8,8h56c4.4,0,8-3.6,8-8V8C72,3.6,68.4,0,64,0z M21.8,62H11V27.3h10.7V62z M16.3,22.8c-3.5,0-6.3-2.9-6.3-6.4c0-3.5,2.8-6.4,6.3-6.4s6.3,2.9,6.3,6.4C22.7,19.9,19.9,22.8,16.3,22.8z M62,62H51.3V43.8c0-5-1.9-7.8-5.8-7.8c-4.3,0-6.5,2.9-6.5,7.8V62H28.6V27.3h10.3v4.7c0,0,3.1-5.7,10.5-5.7c7.4,0,12.6,4.5,12.6,13.8V62z"/>
                </svg>
                LinkedIn
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="email-signup">Email</Label>
                <div className="relative mt-1">
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Mail 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password-signup">Password</Label>
                <div className="relative mt-1">
                  <Input 
                    id="password-signup" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                  />
                </div>
              </div>
              
              <Button type="submit" variant="primary" className="w-full">
                Create Account
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 72 72" width="18" fill="#0A66C2">
                  <path d="M64,0H8C3.6,0,0,3.6,0,8v56c0,4.4,3.6,8,8,8h56c4.4,0,8-3.6,8-8V8C72,3.6,68.4,0,64,0z M21.8,62H11V27.3h10.7V62z M16.3,22.8c-3.5,0-6.3-2.9-6.3-6.4c0-3.5,2.8-6.4,6.3-6.4s6.3,2.9,6.3,6.4C22.7,19.9,19.9,22.8,16.3,22.8z M62,62H51.3V43.8c0-5-1.9-7.8-5.8-7.8c-4.3,0-6.5,2.9-6.5,7.8V62H28.6V27.3h10.3v4.7c0,0,3.1-5.7,10.5-5.7c7.4,0,12.6,4.5,12.6,13.8V62z"/>
                </svg>
                LinkedIn
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;

