'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatPoints } from '@/lib/utils';
import { getTier, TIER_ORDER } from '@/lib/points/tiers';
import {
  Trophy,
  Video,
  ShoppingCart,
  TrendingUp,
  Star,
} from 'lucide-react';

interface DashboardData {
  affiliateId: string;
  affiliateName: string;
  contentPoints: number;
  salesPoints: number;
  totalPoints: number;
  currentMonth: number;
  currentYear: number;
  tier: {
    name: string;
    min_points: number;
    next_tier: string | null;
    next_min_points: number | null;
    progress_percentage: number;
  };
  recentActivities: Array<{
    activity_type: string;
    activity_date: string;
    points: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      if (profile.role === 'admin') {
        // Admin sees aggregate dashboard
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, name')
          .eq('status', 'active');

        if (!affiliates || affiliates.length === 0) {
          setData({
            affiliateId: '',
            affiliateName: profile.full_name,
            contentPoints: 0,
            salesPoints: 0,
            totalPoints: 0,
            currentMonth: new Date().getMonth() + 1,
            currentYear: new Date().getFullYear(),
            tier: getTier(0),
            recentActivities: [],
          });
          setLoading(false);
          return;
        }

        let totalContent = 0;
        let totalSales = 0;

        for (const aff of affiliates) {
          const { data: activities } = await supabase
            .from('activities')
            .select('points')
            .eq('affiliate_id', aff.id)
            .eq('verified', true);

          const { data: sales } = await supabase
            .from('sales')
            .select('points')
            .eq('affiliate_id', aff.id)
            .eq('verified', true);

          totalContent += activities?.reduce((sum, a) => sum + a.points, 0) || 0;
          totalSales += sales?.reduce((sum, s) => sum + s.points, 0) || 0;
        }

        const now = new Date();
        const { data: recentActivities } = await supabase
          .from('activities')
          .select('activity_type, activity_date, points')
          .order('activity_date', { ascending: false })
          .limit(5);

        setData({
          affiliateId: 'admin',
          affiliateName: profile.full_name,
          contentPoints: totalContent,
          salesPoints: totalSales,
          totalPoints: totalContent + totalSales,
          currentMonth: now.getMonth() + 1,
          currentYear: now.getFullYear(),
          tier: getTier(totalContent + totalSales),
          recentActivities: recentActivities || [],
        });
      } else {
        // Affiliate sees their own dashboard
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, name')
          .eq('user_id', user.id)
          .single();

        if (!affiliate) {
          setData({
            affiliateId: '',
            affiliateName: profile.full_name,
            contentPoints: 0,
            salesPoints: 0,
            totalPoints: 0,
            currentMonth: new Date().getMonth() + 1,
            currentYear: new Date().getFullYear(),
            tier: getTier(0),
            recentActivities: [],
          });
          setLoading(false);
          return;
        }

        const now = new Date();
        const { data: activities } = await supabase
          .from('activities')
          .select('activity_type, activity_date, points')
          .eq('affiliate_id', affiliate.id)
          .eq('verified', true)
          .order('activity_date', { ascending: false });

        const { data: sales } = await supabase
          .from('sales')
          .select('points')
          .eq('affiliate_id', affiliate.id)
          .eq('verified', true);

        const contentPoints = activities?.reduce((sum, a) => sum + a.points, 0) || 0;
        const salesPoints = sales?.reduce((sum, s) => sum + s.points, 0) || 0;
        const total = contentPoints + salesPoints;

        setData({
          affiliateId: affiliate.id,
          affiliateName: affiliate.name,
          contentPoints,
          salesPoints,
          totalPoints: total,
          currentMonth: now.getMonth() + 1,
          currentYear: now.getFullYear(),
          tier: getTier(total),
          recentActivities: activities?.slice(0, 5) || [],
        });
      }

      setLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Gagal memuat data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {data.affiliateName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Poin
            </CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPoints(data.totalPoints)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Poin Konten
            </CardTitle>
            <Video className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPoints(data.contentPoints)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Poin Penjualan
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPoints(data.salesPoints)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tier Saat Ini
            </CardTitle>
            <Star className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              {data.tier.name}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progres Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.tier.next_tier ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{data.tier.name}</span>
                <span className="font-medium">{data.tier.next_tier}</span>
              </div>
              <Progress value={data.tier.progress_percentage} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPoints(data.totalPoints)} poin</span>
                <span>{formatPoints(data.tier.next_min_points!)} poin</span>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                {data.tier.name} — Pencapaian Tertinggi!
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada aktivitas</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {activity.activity_type === 'upload_video' && 'Upload Video'}
                      {activity.activity_type === 'shopee_video' && 'Shopee Video'}
                      {activity.activity_type === 'weekly_3_videos' && 'Bonus 3 Video/minggu'}
                      {activity.activity_type === 'weekly_5_videos' && 'Bonus 5 Video/minggu'}
                      {activity.activity_type === 'streak_3_days' && 'Bonus 3 Hari Berturut'}
                      {activity.activity_type === 'streak_7_days' && 'Bonus 7 Hari Berturut'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.activity_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    +{activity.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
