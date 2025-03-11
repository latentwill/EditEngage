
import React from "react";
import { AIMode } from "@/types/ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brain } from "lucide-react";
import { Button } from "./ui-extensions/Button";

interface AIToggleProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

const AIToggle: React.FC<AIToggleProps> = ({ mode, onModeChange }) => {
  const modeLabels: Record<AIMode, string> = {
    human: "Human Mode",
    "pass-through": "AI Assist Mode",
    autopilot: "AI Autopilot",
  };

  const modeDescriptions: Record<AIMode, string> = {
    human: "You review all posts manually",
    "pass-through": "AI suggests actions but you approve them",
    autopilot: "AI handles posts automatically based on your preferences",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={mode === "human" ? "outline" : "primary"} 
          className="flex items-center gap-2"
        >
          <Brain size={16} />
          {modeLabels[mode]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {Object.entries(modeLabels).map(([key, label]) => (
          <DropdownMenuItem 
            key={key}
            className="py-2 px-3 cursor-pointer"
            onClick={() => onModeChange(key as AIMode)}
          >
            <div className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {modeDescriptions[key as AIMode]}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AIToggle;
