
import { cn } from "@/lib/utils";
import { Button as ShadcnButton } from "@/components/ui/button";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "link" | "subtle";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", children, className, showArrow = false, asChild = false, ...props }, ref) => {
    const variantClassMap = {
      primary: "bg-primary text-white hover:bg-primary/90 transition-all duration-300",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-all duration-300",
      subtle: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 transition-all duration-300",
      default: "",
      ghost: "",
      link: "",
    };

    const finalClassName = variantClassMap[variant] ? cn(variantClassMap[variant], className) : className;

    return (
      <ShadcnButton
        ref={ref}
        variant={variant === "primary" || variant === "subtle" ? "default" : variant}
        size={size}
        className={cn(
          "font-medium relative overflow-hidden group", 
          finalClassName
        )}
        asChild={asChild}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
          {showArrow && (
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
        </span>
      </ShadcnButton>
    );
  }
);

Button.displayName = "Button";

export { Button };
