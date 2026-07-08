'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  calculateSalesPoints,
  getActivityPoints,
} from '@/lib/points/calculator';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_POINTS,
  formatPoints,
} from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Video } from 'lucide-react';

export default function ActivitiesPage() {
  const [affiliates, setAffiliates] = useState<
    { id: string; name: string; total_points: number }[]
  >([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState('');
  const [activityType, setActivityType] = useState('');
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'content' | 'sales'>('content');
  const [checkoutCount, setCheckoutCount] = useState(0);
  const [saleMonth, setSaleMonth] = useState(new Date().getMonth() + 1);
  const [saleYear, setSaleYear] = useState(new Date().getFullYear());
  const supabase = createClient();

  useEffect(() => {
    async function loadAffiliates() {
      const { data: affiliatesData } = await supabase
        .from('affiliates')
        .select('id, name')
        .eq('status', 'active');

      setAffiliates(
        affiliatesData?.map((a) => ({ ...a, total_points: 0 })) || []
      );
    }
    loadAffiliates();
  }, [supabase]);

  async function handleSubmitContent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAffiliate || !activityType) {
      toast.error('Pilih affiliate dan tipe aktivitas');
      return;
    }

    setLoading(true);

    const points = getActivityPoints(activityType);

    const { error: activityError } = await supabase.from('activities').insert({
      affiliate_id: selectedAffiliate,
      activity_type: activityType,
      activity_date: activityDate,
      description: description || null,
      points,
      verified: true,
      verified_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (activityError) {
      toast.error('Gagal menyimpan aktivitas');
      setLoading(false);
      return;
    }

    // Log points
    await supabase.from('point_logs').insert({
      affiliate_id: selectedAffiliate,
      source_type: 'activity',
      source_id: activityError ? '' : 'pending',
      points,
      description: `${ACTIVITY_TYPE_LABELS[activityType]} - ${activityDate}`,
    });

    toast.success(
      `Aktivitas berhasil ditambahkan (+${formatPoints(points)} poin)`
    );

    setActivityType('');
    setDescription('');
    setLoading(false);
  }

  async function handleSubmitSales(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAffiliate || checkoutCount <= 0) {
      toast.error('Pilih affiliate dan masukkan jumlah checkout');
      return;
    }

    setLoading(true);

    const points = calculateSalesPoints(checkoutCount);

    const { error: salesError } = await supabase.from('sales').upsert(
      {
        affiliate_id: selectedAffiliate,
        checkout_count: checkoutCount,
        sale_month: saleMonth,
        sale_year: saleYear,
        points,
        verified: true,
        verified_by: (await supabase.auth.getUser()).data.user?.id,
      },
      {
        onConflict: 'affiliate_id, sale_month, sale_year',
      }
    );

    if (salesError) {
      toast.error('Gagal menyimpan data penjualan');
      setLoading(false);
      return;
    }

    await supabase.from('point_logs').insert({
      affiliate_id: selectedAffiliate,
      source_type: 'sales',
      source_id: salesError ? '' : 'pending',
      points,
      description: `Penjualan ${checkoutCount} CO - ${saleMonth}/${saleYear}`,
    });

    toast.success(
      `Data penjualan berhasil disimpan (+${formatPoints(points)} poin)`
    );

    setCheckoutCount(0);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Input Aktivitas</h1>
        <p className="text-muted-foreground">
          Tambah aktivitas konten atau penjualan affiliate
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'content' ? 'default' : 'outline'}
          onClick={() => setTab('content')}
          className={tab === 'content' ? 'bg-orange-600 hover:bg-orange-700' : ''}
        >
          <Video className="h-4 w-4 mr-2" />
          Aktivitas Konten
        </Button>
        <Button
          variant={tab === 'sales' ? 'default' : 'outline'}
          onClick={() => setTab('sales')}
          className={tab === 'sales' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Penjualan
        </Button>
      </div>

      {/* Content Activity Form */}
      {tab === 'content' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-500" />
              Tambah Aktivitas Konten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitContent} className="space-y-4">
              <div className="space-y-2">
                <Label>Affiliate</Label>
                <Select
                  value={selectedAffiliate}
                  onValueChange={(v) => setSelectedAffiliate(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipe Aktivitas</Label>
                <Select value={activityType} onValueChange={(v) => setActivityType(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label} (+{ACTIVITY_TYPE_POINTS[key]} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi (opsional)</Label>
                <Input
                  type="text"
                  placeholder="URL video atau catatan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Menyimpan...' : 'Tambah Aktivitas'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sales Form */}
      {tab === 'sales' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              Tambah Data Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitSales} className="space-y-4">
              <div className="space-y-2">
                <Label>Affiliate</Label>
                <Select
                  value={selectedAffiliate}
                  onValueChange={(v) => setSelectedAffiliate(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jumlah Checkout (CO)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={checkoutCount || ''}
                  onChange={(e) => setCheckoutCount(parseInt(e.target.value) || 0)}
                  required
                />
                {checkoutCount > 0 && (
                  <p className="text-sm text-green-600">
                    Poin: {calculateSalesPoints(checkoutCount)} pts
                    {calculateSalesPoints(checkoutCount) !==
                      checkoutCount * 30 && (
                      <span className="text-amber-600">
                        {' '}
                        (termasuk bonus milestone)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select
                    value={String(saleMonth)}
                    onValueChange={(v) => setSaleMonth(parseInt(v ?? '0'))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {new Date(0, i).toLocaleDateString('id-ID', {
                            month: 'long',
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Select
                    value={String(saleYear)}
                    onValueChange={(v) => setSaleYear(parseInt(v ?? '0'))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  Kalkulasi Poin Penjualan Bulan Ini
                </h4>
                {checkoutCount > 0 ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      {checkoutCount} CO × 30 pts = {checkoutCount * 30} pts
                      (dasar)
                    </p>
                    {([5, 10, 20, 50] as const).includes(
                      checkoutCount as 5 | 10 | 20 | 50
                    ) && (
                      <p className="text-amber-600">
                        + Bonus Milestone {checkoutCount} CO ={' '}
                        {calculateSalesPoints(checkoutCount) -
                          checkoutCount * 30}{' '}
                        pts
                      </p>
                    )}
                    <p className="font-medium text-green-700">
                      Total: {calculateSalesPoints(checkoutCount)} pts
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Masukkan jumlah CO untuk melihat kalkulasi
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Menyimpan...' : 'Simpan Data Penjualan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
