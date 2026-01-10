export interface CosmosTrail {
  id: string;
  createdAt: string | Date;
  trailData: { x: number; y: number; z?: number; t?: number }[];
  duration: number;
  color?: string;
  title?: string;
  userName?: string;
  description?: string;
  message?: string;
  walletAddress?: string;
  isPaid?: boolean; // Added for paid status visualization
}
