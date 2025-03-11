
export type AIMode = "human" | "pass-through" | "autopilot";

export interface AIDecision {
  id: string;
  postId: string;
  decision: "approve" | "deny" | "edit";
  timestamp: string;
  confidence: number;
  reasoning?: string;
  userOverride?: boolean;
}
