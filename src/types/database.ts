export type UserRole = 'admin' | 'affiliate';
export type AffiliateStatus = 'active' | 'inactive';
export type ActivityType =
  | 'upload_video'
  | 'shopee_video'
  | 'weekly_3_videos'
  | 'weekly_5_videos'
  | 'streak_3_days'
  | 'streak_7_days';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  name: string;
  tiktok_username: string | null;
  phone: string | null;
  status: AffiliateStatus;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  affiliate_id: string;
  activity_type: ActivityType;
  activity_date: string;
  description: string | null;
  points: number;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  affiliate_id: string;
  checkout_count: number;
  sale_month: number;
  sale_year: number;
  points: number;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointLog {
  id: string;
  affiliate_id: string;
  source_type: 'activity' | 'sales';
  source_id: string;
  points: number;
  description: string;
  created_at: string;
}

export interface Tier {
  id: string;
  name: string;
  min_points: number;
  benefit_description: string | null;
  display_order: number;
  created_at: string;
}

export interface LeaderboardEntry {
  affiliate_id: string;
  affiliate_name: string;
  tiktok_username: string | null;
  content_points: number;
  sales_points: number;
  total_points: number;
  current_tier: string | null;
  tier_min_points: number | null;
}

export interface AffiliateWithStats extends Affiliate {
  content_points: number;
  sales_points: number;
  total_points: number;
  current_tier: string | null;
  tier_min_points: number | null;
}

export interface DashboardStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalActivitiesThisMonth: number;
  totalSalesThisMonth: number;
  topAffiliate: AffiliateWithStats | null;
}
