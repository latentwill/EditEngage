
import React, { useState } from "react";
import { Post } from "@/types/post";
import { AIMode } from "@/types/ai";
import { Button } from "@/components/ui-extensions/Button";
import { Calendar, Check, MessageCircle, X, Zap } from "lucide-react";
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM yyyy');
  };
  
  const truncateContent = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md overflow-hidden">
      {/* Card Header */}
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3">
            <Zap size={16} className="text-green-500" />
          </div>
          <div>
            <span className="text-sm font-medium">
              {post.sourceAgent} on {post.platform} submitted this post
            </span>
            <div className="text-xs text-muted-foreground">
              {formatDate(post.createdAt)}
            </div>
          </div>
        </div>
        <PlatformIcon platform={post.platform} size={24} />
      </div>
      
      {/* Post Title */}
      <div className="px-4 pt-2 pb-3 text-center">
        <h3 className="font-semibold text-base">
          {post.title || `Post for ${post.account}`}
        </h3>
      </div>

      {/* Content Comparison */}
      <div className="flex border-t border-border/50">
        {/* Original Content */}
        <div className="flex-1 p-4 border-r border-border/50 relative">
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
              Submitted
            </span>
          </div>
          <div className="mb-3 mt-6 text-sm text-gray-700">
            {truncateContent(post.content)}
          </div>
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="w-full h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
              Media attachment
            </div>
          )}
        </div>
        
        {/* Edited Content */}
        <div className="flex-1 p-4 relative">
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
              Edited
            </span>
          </div>
          <div className="mb-3 mt-6 text-sm text-gray-700">
            {post.editedContent ? truncateContent(post.editedContent) : "Not yet edited"}
          </div>
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="w-full h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
              Media attachment
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center p-4 pt-2 border-t border-border/50">
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
