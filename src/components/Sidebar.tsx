
import React, { useState } from "react";
import { Button } from "@/components/ui-extensions/Button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Send, Sparkles } from "lucide-react";

interface SidebarProps {
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [includePostContent, setIncludePostContent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAIResponse] = useState("");

  const handleSendPrompt = () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setAIResponse("I've revised your post to be more engaging and concise. The new version emphasizes your key points while maintaining a professional tone that aligns with your brand voice.");
      setLoading(false);
    }, 1500);
  };

  const handleApplyChanges = () => {
    // Logic to apply AI changes to the post
    onClose();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/50 h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-border/50">
        <h3 className="font-medium">Enhance with AI</h3>
        <button onClick={onClose}>
          <X size={18} className="text-muted-foreground hover:text-foreground" />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">AI Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox 
              id="includeContent" 
              checked={includePostContent} 
              onCheckedChange={(checked) => setIncludePostContent(checked as boolean)} 
            />
            <label 
              htmlFor="includeContent" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include post content in prompt
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Prompt</label>
          <Textarea 
            placeholder="Tell the AI how to improve your post..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        {aiResponse && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">AI Response</label>
            <div className="bg-secondary/30 p-3 rounded-md text-sm">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-border/50">
        {!aiResponse ? (
          <Button 
            variant="primary" 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || loading}
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full" />
            ) : (
              <Send size={16} />
            )}
            Send to AI
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setAIResponse("")}
            >
              Try Again
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 flex items-center justify-center gap-1"
              onClick={handleApplyChanges}
            >
              <Sparkles size={14} />
              Apply Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
