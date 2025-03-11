import React, { useState } from "react";
import { Post } from "@/types/post";
import { AIMode } from "@/types/ai";
import { Button } from "@/components/ui-extensions/Button";
import { Calendar, Check, X, Zap } from "lucide-react";
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
  const [showEdited, setShowEdited] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM yyyy');
  };
  
  const truncateContent = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className="mb-8 max-w-4xl">
      {/* Agent Info Section - Now with line */}
      <div className="flex items-center mb-3 relative pl-14">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 z-10">
            <Zap size={16} className="text-green-500" />
          </div>
          <div className="w-6 h-[2px] bg-border/50 absolute left-8" />
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium">{post.sourceAgent}</span>
          <span className="mx-1">on</span>
          <span className="font-medium">{post.platform}</span>
          <span className="mx-1">submitted this post</span>
          <span className="ml-2 text-muted-foreground">in {formatDate(post.createdAt)}</span>
        </div>
      </div>

      {/* The Card */}
      <div className="relative bg-white rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md overflow-hidden ml-14">
        {/* Post Title */}
        <div className="px-4 pt-4 pb-3 text-center">
          <h3 className="font-semibold text-base">
            {post.title || `Post for ${post.account}`}
          </h3>
        </div>

        {/* Slider Switch */}
        <div className="flex justify-end px-4 mb-2">
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-medium ${!showEdited ? 'text-amber-800' : 'text-gray-400'}`}>Submitted</span>
            <button 
              onClick={() => setShowEdited(!showEdited)}
              className="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <div 
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showEdited ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${showEdited ? 'text-green-800' : 'text-gray-400'}`}>Edited</span>
          </div>
        </div>

        {/* Content Display */}
        <div className="px-4 py-3 min-h-[120px] transition-all duration-300 ease-in-out">
          {showEdited ? (
            <div className="relative">
              <div className="absolute top-0 right-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                  Edited
                </span>
              </div>
              <div className="pt-6 text-sm text-gray-700">
                {post.editedContent ? truncateContent(post.editedContent) : "Not yet edited"}
              </div>
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="mt-3 w-full h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                  Media attachment
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute top-0 right-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                  Submitted
                </span>
              </div>
              <div className="pt-6 text-sm text-gray-700">
                {truncateContent(post.content)}
              </div>
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="mt-3 w-full h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                  Media attachment
                </div>
              )}
            </div>
          )}
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
              Edit
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

        {/* Platform Icon */}
        <div className="absolute top-4 right-4">
          <PlatformIcon platform={post.platform} size={20} />
        </div>
      </div>
    </div>
  );
};

export default PostCard;
