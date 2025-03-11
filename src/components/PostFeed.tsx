
import React from "react";
import { Post, PostStatus } from "@/types/post";
import { AIMode } from "@/types/ai";
import PostCard from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for demonstration purposes
const mockPosts: Post[] = [
  {
    id: "1",
    title: "Social Media in 2028",
    content: "Excited to announce our new product launch! Check out our website for more details. #innovation #tech",
    editedContent: "Excited to announce our innovative product launch! Visit our website for more details. #innovation #tech #future",
    platform: "twitter",
    account: "@techcompany",
    status: "pending",
    sourceAgent: "Marketing AI",
    createdAt: "2023-06-15T10:30:00Z",
    tags: [
      { id: "1", name: "marketing", color: "#ADD8E6" },
      { id: "2", name: "product-launch", color: "#FFD700" }
    ],
    aiSuggestion: "approve",
    aiConfidence: 0.89
  },
  {
    id: "2",
    title: "Job Opportunities",
    content: "We're hiring! Join our team of passionate developers and help us build the future of technology. Apply now at careers.techcompany.com",
    platform: "linkedin",
    account: "Tech Company Inc.",
    status: "pending",
    sourceAgent: "HR AI",
    createdAt: "2023-06-14T14:45:00Z",
    tags: [
      { id: "3", name: "hiring", color: "#98FB98" },
      { id: "4", name: "careers", color: "#FFA07A" }
    ],
    aiSuggestion: "edit",
    aiConfidence: 0.72
  },
  {
    id: "3",
    title: "Tech Conference Highlights",
    content: "Our team had a great time at the tech conference last weekend. Thanks to all who stopped by our booth!",
    editedContent: "Our fantastic team had an amazing time at the tech conference last weekend. Thanks to everyone who visited our booth and engaged with our demos!",
    platform: "linkedin",
    account: "Tech Company Inc.",
    status: "scheduled",
    scheduledFor: "2023-06-20T09:00:00Z",
    sourceAgent: "Event AI",
    createdAt: "2023-06-13T11:15:00Z",
    tags: [
      { id: "5", name: "events", color: "#DDA0DD" }
    ],
    aiSuggestion: "approve",
    aiConfidence: 0.95
  }
];

interface PostFeedProps {
  status: PostStatus;
  aiMode: AIMode;
  onEditWithAI: () => void;
}

const PostFeed: React.FC<PostFeedProps> = ({ status, aiMode, onEditWithAI }) => {
  const [loading, setLoading] = React.useState(false);
  const [posts, setPosts] = React.useState<Post[]>([]);

  React.useEffect(() => {
    // Simulating API fetch
    setLoading(true);
    setTimeout(() => {
      setPosts(mockPosts.filter(post => post.status === status));
      setLoading(false);
    }, 1000);
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-border/50">
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex space-x-2">
                <div className="w-1/2">
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="w-1/2">
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 shadow-sm border border-border/50 text-center">
        <h3 className="text-lg font-medium mb-2">No posts found</h3>
        <p className="text-muted-foreground mb-4">There are no posts with this status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          aiMode={aiMode} 
          onEditWithAI={onEditWithAI} 
        />
      ))}
    </div>
  );
};

export default PostFeed;
