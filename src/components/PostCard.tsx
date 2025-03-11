
import React, { useState } from "react";
import { Post } from "@/types/post";
import { AIMode } from "@/types/ai";
import { Button } from "@/components/ui-extensions/Button";
import { Calendar, Check, MessageCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import PlatformIcon from "./PlatformIcon";

interface PostCardProps {
  post: Post;
  aiMode: AIMode;
  onEditWithAI: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, aiMode, onEditWithAI }) => {
  const [expanded, setExpanded] = useState(false);

  const renderAIBadge = () => {
    if (!post.aiSuggestion || aiMode === "human") return null;

    const badgeColor = post.aiSuggestion === "approve" 
      ? "bg-green-100 text-green-800"
      : post.aiSuggestion === "deny"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

    const badgeText = post.aiSuggestion === "approve" 
      ? "AI: Approve"
      : post.aiSuggestion === "deny"
        ? "AI: Deny"
        : "AI: Edit";

    return (
      <div className={cn("text-xs flex items-center px-2 py-1 rounded-full", badgeColor)}>
        {badgeText} ({Math.round(post.aiConfidence! * 100)}%)
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-border/50 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <PlatformIcon platform={post.platform} className="mr-2" />
          <span className="font-medium text-sm">{post.account}</span>
        </div>
        {renderAIBadge()}
      </div>

      <div 
        className={cn(
          "text-sm mb-4 relative overflow-hidden transition-all", 
          !expanded && "max-h-20"
        )}
      >
        <p>{post.content}</p>
        {!expanded && post.content.length > 150 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      
      {post.content.length > 150 && (
        <button 
          className="text-xs text-primary mb-3 font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {post.tags.map((tag) => (
          <Badge key={tag.id} style={{ backgroundColor: tag.color }} variant="secondary" className="text-xs">
            {tag.name}
          </Badge>
        ))}
      </div>

      <div className="flex items-center text-xs text-muted-foreground mb-4">
        <span className="mr-4">Source: {post.sourceAgent}</span>
        <span>Created: {format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
      </div>

      {post.scheduledFor && (
        <div className="flex items-center text-xs text-primary mb-4">
          <Calendar size={14} className="mr-1" />
          <span>Scheduled for {format(new Date(post.scheduledFor), 'MMM d, yyyy h:mm a')}</span>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-border/50">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="text-xs flex items-center">
            <Calendar size={14} className="mr-1" />
            Schedule
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex items-center"
            onClick={onEditWithAI}
          >
            <MessageCircle size={14} className="mr-1" />
            Edit with AI
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs border-red-200 text-red-700 hover:bg-red-50"
          >
            <X size={14} className="mr-1" />
            Deny
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs border-green-200 text-green-700 hover:bg-green-50"
          >
            <Check size={14} className="mr-1" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
