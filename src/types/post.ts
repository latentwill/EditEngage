
export type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "tiktok" | "bluesky" | "threads";

export type PostStatus = "pending" | "approved" | "denied" | "scheduled";

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Post {
  id: string;
  content: string;
  platform: Platform;
  account: string;
  status: PostStatus;
  sourceAgent: string;
  createdAt: string;
  scheduledFor?: string;
  mediaUrls?: string[];
  tags: Tag[];
  aiSuggestion?: string;
  aiConfidence?: number;
  editedContent?: string;
  title?: string;
}
