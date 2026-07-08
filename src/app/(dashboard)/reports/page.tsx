'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('leaderboard');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleExport() {
    setLoading(true);

    try {
      let data: Record<string, unknown>[] = [];
      let filename = '';
      let sheetName = '';

      if (reportType === 'leaderboard') {
        const { data: leaderboard } = await supabase
          .from('leaderboard_summary')
          .select('*');

        data = (leaderboard || []).map((entry, i) => ({
          Peringkat: i + 1,
          Nama: entry.affiliate_name,
          'TikTok Username': entry.tiktok_username || '',
          'Poin Konten': entry.content_points,
          'Poin Penjualan': entry.sales_points,
          'Total Poin': entry.total_points,
          Tier: entry.current_tier || '',
        }));
        filename = `leaderboard_${year}_${String(month).padStart(2, '0')}.xlsx`;
        sheetName = 'Leaderboard';
      } else if (reportType === 'activities') {
        const { data: activities } = await supabase
          .from('activities')
          .select(
            'activity_type, activity_date, points, verified, affiliates(name)'
          )
          .order('activity_date', { ascending: false });

        data = (activities || []).map((a) => ({
          Affiliate: (a.affiliates as unknown as { name: string })?.name || '',
          'Tipe Aktivitas': a.activity_type,
          Tanggal: a.activity_date,
          Poin: a.points,
          Status: a.verified ? 'Terverifikasi' : 'Pending',
        }));
        filename = `aktivitas_${year}_${String(month).padStart(2, '0')}.xlsx`;
        sheetName = 'Aktivitas';
      } else if (reportType === 'sales') {
        const { data: sales } = await supabase
          .from('sales')
          .select(
            'checkout_count, points, sale_month, sale_year, verified, affiliates(name)'
          )
          .eq('sale_month', month)
          .eq('sale_year', year);

        data = (sales || []).map((s) => ({
          Affiliate: (s.affiliates as unknown as { name: string })?.name || '',
          'Jumlah Checkout': s.checkout_count,
          Bulan: `${s.sale_month}/${s.sale_year}`,
          Poin: s.points,
          Status: s.verified ? 'Terverifikasi' : 'Pending',
        }));
        filename = `penjualan_${year}_${String(month).padStart(2, '0')}.xlsx`;
        sheetName = 'Penjualan';
      } else if (reportType === 'affiliates') {
        const { data: affiliates } = await supabase.from('affiliates').select(`
            id,
            name,
            tiktok_username,
            phone,
            status,
            created_at
          `)
          .order('created_at', { ascending: false });

        data = (affiliates || []).map((a) => ({
          Nama: a.name,
          'TikTok Username': a.tiktok_username || '',
          Telepon: a.phone || '',
          Status: a.status === 'active' ? 'Aktif' : 'Nonaktif',
          'Tanggal Bergabung': a.created_at,
        }));
        filename = `daftar_affiliate.xlsx`;
        sheetName = 'Affiliate';
      }

      if (data.length === 0) {
        toast.error('Tidak ada data untuk diexport');
        setLoading(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Auto-fit column widths
      const colWidths = Object.keys(data[0] as Record<string, unknown>).map(
        (key) => ({
          wch: Math.max(
            key.length,
            ...data.map(
              (row) =>
                String((row as Record<string, unknown>)[key] || '').length
            )
          ),
        })
      );
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, filename);
      toast.success(`Laporan berhasil didownload: ${filename}`);
    } catch {
      toast.error('Gagal mengexport data');
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
        <p className="text-muted-foreground">
          Export data poin, aktivitas, dan affiliate ke Excel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Jenis Laporan</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v ?? 'leaderboard')}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leaderboard">Leaderboard</SelectItem>
                <SelectItem value="activities">Aktivitas Konten</SelectItem>
                <SelectItem value="sales">Data Penjualan</SelectItem>
                <SelectItem value="affiliates">Daftar Affiliate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === 'sales' && (
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(parseInt(v ?? '0'))}
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
                  value={String(year)}
                  onValueChange={(v) => setYear(parseInt(v ?? '0'))}
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
          )}

          <Button onClick={handleExport} disabled={loading} size="lg">
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Mengexport...' : 'Download Excel'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
