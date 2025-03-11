
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui-extensions/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { User, Settings, LogOut, LayoutDashboard, TagIcon, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Tags", path: "/tags", icon: TagIcon },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out py-4",
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-subtle"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-medium text-foreground flex items-center gap-2">
              <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">E</span>
              </span>
              <span>EditEngage</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user && navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm flex items-center gap-1"
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            ))}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="subtle" size="sm" className="h-9 w-9 rounded-full p-0">
                    <span className="sr-only">Open user menu</span>
                    <User size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings size={16} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => signOut()}>
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className={cn("h-6 w-6 transition-transform", isMobileMenuOpen ? "rotate-90" : "")}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-subtle transition-all duration-300 overflow-hidden",
          isMobileMenuOpen ? "max-h-80" : "max-h-0"
        )}
      >
        <div className="px-4 pt-2 pb-4 space-y-1">
          {user && navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={18} className="mr-2" />
              {item.name}
            </Link>
          ))}
          {user ? (
            <div className="pt-2 pb-1 border-t border-border/50 mt-2">
              <Link
                to="/profile"
                className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User size={18} className="mr-2" />
                Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings size={18} className="mr-2" />
                Settings
              </Link>
              <button
                className="flex items-center px-3 py-2 text-base font-medium text-red-600 hover:bg-muted/50 rounded-md w-full text-left"
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User size={18} className="mr-2" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
