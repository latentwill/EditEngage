
import React, { useEffect, useRef } from "react";
import { Button } from "./ui-extensions/Button";

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleParallax = () => {
      if (!heroRef.current || !imageRef.current) return;
      
      const scrollPosition = window.scrollY;
      const parallaxValue = scrollPosition * 0.3;
      
      // Apply parallax effect to the image background
      imageRef.current.style.transform = `translateY(${parallaxValue}px)`;
    };
    
    window.addEventListener("scroll", handleParallax);
    return () => window.removeEventListener("scroll", handleParallax);
  }, []);

  return (
    <div 
      ref={heroRef} 
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background elements */}
      <div 
        ref={imageRef}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent opacity-70" />
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-primary/5 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-1/4 left-1/3 w-56 h-56 rounded-full bg-primary/5 animate-float" style={{ animationDelay: "4s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center">
        <div className="inline-block mb-6 animate-fade-in">
          <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            Introducing New Design
          </span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto animate-fade-in animation-delay-200">
          <span className="block">Simplicity is the ultimate</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            sophistication
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in animation-delay-400">
          Experience the perfect harmony between form and function. Our design philosophy focuses on
          what truly matters, eliminating everything else.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-600">
          <Button variant="primary" size="lg" showArrow>
            Discover More
          </Button>
          <Button variant="outline" size="lg">
            Watch the Video
          </Button>
        </div>
      </div>
      
      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"></path>
        </svg>
      </div>
    </div>
  );
};

export default Hero;
