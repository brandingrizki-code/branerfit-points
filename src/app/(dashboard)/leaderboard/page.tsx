'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatPoints } from '@/lib/utils';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  affiliate_id: string;
  affiliate_name: string;
  tiktok_username: string | null;
  content_points: number;
  sales_points: number;
  total_points: number;
  current_tier: string | null;
  tier_min_points: number | null;
}

const TIER_COLORS: Record<string, string> = {
  'Branerfit Champion': 'bg-purple-100 text-purple-700 border-purple-200',
  'Diamond Affiliate': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Gold Affiliate': 'bg-amber-100 text-amber-700 border-amber-200',
  'Silver Affiliate': 'bg-slate-100 text-slate-700 border-slate-200',
  'Bronze Affiliate': 'bg-orange-100 text-orange-700 border-orange-200',
  'Rising Affiliate': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filterTier, setFilterTier] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadLeaderboard() {
      const { data } = await supabase.from('leaderboard_summary').select('*');
      setEntries(data || []);
      setLoading(false);
    }
    loadLeaderboard();
  }, [supabase]);

  const filteredEntries =
    filterTier === 'all'
      ? entries
      : entries.filter((e) => e.current_tier === filterTier);

  const uniqueTiers = [...new Set(entries.map((e) => e.current_tier).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat leaderboard...</p>
      </div>
    );
  }

  function getRankBadge(index: number) {
    if (index === 0)
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1)
      return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2)
      return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
        <p className="text-muted-foreground">
          Peringkat affiliate berdasarkan total poin
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Peringkat Affiliate</CardTitle>
          <Select value={filterTier} onValueChange={(v) => setFilterTier(v ?? 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tier</SelectItem>
              {uniqueTiers.map((tier) => (
                <SelectItem key={tier} value={tier!}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada data affiliate
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Poin Konten</TableHead>
                  <TableHead className="text-right">Poin Penjualan</TableHead>
                  <TableHead className="text-right">Total Poin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, i) => (
                  <TableRow
                    key={entry.affiliate_id}
                    className={i < 3 ? 'bg-slate-50' : ''}
                  >
                    <TableCell className="font-medium">
                      {getRankBadge(i)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {entry.affiliate_name}
                        </p>
                        {entry.tiktok_username && (
                          <p className="text-xs text-muted-foreground">
                            @{entry.tiktok_username}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.current_tier && (
                        <Badge
                          variant="outline"
                          className={TIER_COLORS[entry.current_tier] || ''}
                        >
                          {entry.current_tier}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPoints(entry.content_points)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPoints(entry.sales_points)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatPoints(entry.total_points)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
