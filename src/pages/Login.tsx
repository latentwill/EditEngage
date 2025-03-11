import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui-extensions/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Github, Linkedin } from "lucide-react";
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
                <Github size={18} />
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
                <Github size={18} />
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

