/**
 * POINT CALCULATION RULES
 * 
 * Content Points:
 * - upload_video:      20 pts per video
 * - shopee_video:      10 pts per video
 * - weekly_3_videos:  +50 bonus (3+ videos in a week)
 * - weekly_5_videos:  +100 bonus (5+ videos in a week)
 * - streak_3_days:    +50 bonus (3 consecutive days uploading)
 * - streak_7_days:    +150 bonus (7 consecutive days uploading)
 * 
 * Sales Points (Per-CO + Bonus Milestone):
 * - Per checkout: 30 pts
 * - Milestone bonuses: 5CO=+150, 10CO=+350, 20CO=+700, 50CO=+2000
 *   Bonus only applies when hitting exact milestone (not cumulative)
 */

export const CONTENT_POINTS: Record<string, number> = {
  upload_video: 20,
  shopee_video: 10,
  weekly_3_videos: 50,
  weekly_5_videos: 100,
  streak_3_days: 50,
  streak_7_days: 150,
} as const;

export const PER_CHECKOUT_POINTS = 30;

export const SALES_MILESTONES: { checkout: number; bonus: number }[] = [
  { checkout: 50, bonus: 2000 },
  { checkout: 20, bonus: 700 },
  { checkout: 10, bonus: 350 },
  { checkout: 5, bonus: 150 },
];

export function getActivityPoints(type: string): number {
  return CONTENT_POINTS[type] || 0;
}

export function calculateSalesPoints(checkoutCount: number): number {
  if (checkoutCount <= 0) return 0;

  const basePoints = checkoutCount * PER_CHECKOUT_POINTS;

  const match = SALES_MILESTONES.find((m) => m.checkout === checkoutCount);

  const bonus = match ? match.bonus : 0;

  return basePoints + bonus;
}

export function calculatePoints(
  _totalPoints: number,
  _newPoints: number
): { newTier: string | null; previousTier: string | null } {
  return { newTier: null, previousTier: null };
}
