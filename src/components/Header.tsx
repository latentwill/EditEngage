
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui-extensions/Button";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out py-4",
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-subtle"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-xl font-medium text-foreground flex items-center gap-2">
              <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">A</span>
              </span>
              <span className="animate-fade-in">Aesthetic</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {["Products", "Features", "About", "Contact"].map((item, index) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm animate-fade-in",
                  `animation-delay-${index * 200}`
                )}
              >
                {item}
              </a>
            ))}
            <Button variant="primary" size="sm" className="animate-fade-in animation-delay-600">
              Get Started
            </Button>
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
          {["Products", "Features", "About", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className="pt-2 pb-1">
            <Button variant="primary" className="w-full">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
