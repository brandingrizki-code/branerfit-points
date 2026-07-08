import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('id-ID').format(points);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getCurrentMonthPeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  upload_video: 'Upload Video',
  shopee_video: 'Shopee Video (mirroring)',
  weekly_3_videos: 'Bonus 3 Video/minggu',
  weekly_5_videos: 'Bonus 5 Video/minggu',
  streak_3_days: 'Bonus 3 Hari Berturut-turut',
  streak_7_days: 'Bonus 7 Hari Berturut-turut',
};

export const ACTIVITY_TYPE_POINTS: Record<string, number> = {
  upload_video: 20,
  shopee_video: 10,
  weekly_3_videos: 50,
  weekly_5_videos: 100,
  streak_3_days: 50,
  streak_7_days: 150,
};
