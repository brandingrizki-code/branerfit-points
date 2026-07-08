export const TIERS = [
  { id: 1, name: 'Rising Affiliate', min_points: 0 },
  { id: 2, name: 'Bronze Affiliate', min_points: 1000 },
  { id: 3, name: 'Silver Affiliate', min_points: 3000 },
  { id: 4, name: 'Gold Affiliate', min_points: 7000 },
  { id: 5, name: 'Diamond Affiliate', min_points: 15000 },
  { id: 6, name: 'Branerfit Champion', min_points: 30000 },
] as const;

export const TIER_ORDER = [
  { name: 'Rising Affiliate', min_points: 1000 },
  { name: 'Bronze Affiliate', min_points: 3000 },
  { name: 'Silver Affiliate', min_points: 7000 },
  { name: 'Gold Affiliate', min_points: 15000 },
  { name: 'Diamond Affiliate', min_points: 30000 },
  { name: 'Branerfit Champion', min_points: 50000 },
] as const;

export function getTier(totalPoints: number): {
  name: string;
  min_points: number;
  next_tier: string | null;
  next_min_points: number | null;
  progress_percentage: number;
} {
  let currentTier: { readonly name: string; readonly min_points: number } = TIER_ORDER[0];
  let nextTier: { readonly name: string; readonly min_points: number } | null = TIER_ORDER[1];

  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (totalPoints >= TIER_ORDER[i].min_points) {
      currentTier = TIER_ORDER[i];
      nextTier = TIER_ORDER[i + 1] ?? null;
      break;
    }
  }

  const progress =
    nextTier && totalPoints >= currentTier.min_points
      ? ((totalPoints - currentTier.min_points) /
          (nextTier.min_points - currentTier.min_points)) *
        100
      : totalPoints >= TIER_ORDER[TIER_ORDER.length - 1].min_points
        ? 100
        : 0;

  return {
    name: currentTier.name,
    min_points: currentTier.min_points,
    next_tier: nextTier?.name || null,
    next_min_points: nextTier?.min_points || null,
    progress_percentage: Math.min(100, Math.round(progress * 100) / 100),
  };
}

export function checkTierUp(
  previousPoints: number,
  currentPoints: number
): { tieredUp: boolean; newTierName: string | null; oldTierName: string | null } {
  const oldTier = getTier(previousPoints);
  const newTier = getTier(currentPoints);
  return {
    tieredUp: newTier.name !== oldTier.name,
    newTierName: newTier.name,
    oldTierName: oldTier.name,
  };
}
