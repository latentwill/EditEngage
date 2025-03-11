
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui-extensions/Button";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isHomePage = location.pathname === "/";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-transparent py-4"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-medium text-foreground flex items-center gap-2">
              <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#8B5CF6] font-semibold">E</span>
              </span>
              <span>ditEngage</span>
            </Link>
          </div>
          
          {isHomePage && !user && (
            <div>
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
