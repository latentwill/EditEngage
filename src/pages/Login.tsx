
import React from "react";
import { Button } from "@/components/ui-extensions/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Github, Linkedin } from "lucide-react";

const Login = () => {
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
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className="pl-10"
              />
              <Mail 
                size={18} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-xs text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative mt-1">
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="pl-10" 
              />
              <Lock 
                size={18} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              />
            </div>
          </div>
          
          <Button variant="primary" className="w-full">
            Sign in
          </Button>
          
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
              <Linkedin size={18} />
              LinkedIn
            </Button>
          </div>
          
          <div className="text-center mt-6 text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <a href="#" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
