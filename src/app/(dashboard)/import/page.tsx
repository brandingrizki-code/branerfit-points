'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { calculateSalesPoints, getActivityPoints } from '@/lib/points/calculator';
import { formatPoints } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'activities' | 'sales' | 'affiliates'>('activities');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleDownloadTemplate() {
    const headers: Record<string, string[]> = {
      activities: [
        'affiliate_name',
        'activity_type',
        'activity_date',
        'description',
      ],
      sales: [
        'affiliate_name',
        'checkout_count',
        'sale_month',
        'sale_year',
      ],
      affiliates: [
        'full_name',
        'email',
        'name',
        'tiktok_username',
        'phone',
      ],
    };

    const csvContent =
      '\uFEFF' + headers[importType].join(',') + '\n' + '...';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${importType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) {
      toast.error('Pilih file CSV terlebih dahulu');
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      if (lines.length < 2) {
        toast.error('File kosong atau format salah');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;

      if (importType === 'activities') {
        for (const row of rows) {
          const cols = row.split(',').map((c) => c.trim());
          const data: Record<string, string> = {};
          headers.forEach((h, i) => {
            data[h] = cols[i] || '';
          });

          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('id')
            .ilike('name', data.affiliate_name)
            .single();

          if (!affiliate) {
            errorCount++;
            continue;
          }

          const points = getActivityPoints(data.activity_type);

          const { error } = await supabase.from('activities').insert({
            affiliate_id: affiliate.id,
            activity_type: data.activity_type,
            activity_date: data.activity_date,
            description: data.description || null,
            points,
            verified: true,
          });

          if (error) {
            errorCount++;
          } else {
            successCount++;
          }
        }
      } else if (importType === 'sales') {
        for (const row of rows) {
          const cols = row.split(',').map((c) => c.trim());
          const data: Record<string, string> = {};
          headers.forEach((h, i) => {
            data[h] = cols[i] || '';
          });

          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('id')
            .ilike('name', data.affiliate_name)
            .single();

          if (!affiliate) {
            errorCount++;
            continue;
          }

          const checkoutCount = parseInt(data.checkout_count);
          const month = parseInt(data.sale_month);
          const year = parseInt(data.sale_year);
          const points = calculateSalesPoints(checkoutCount);

          const { error } = await supabase.from('sales').upsert(
            {
              affiliate_id: affiliate.id,
              checkout_count: checkoutCount,
              sale_month: month,
              sale_year: year,
              points,
              verified: true,
            },
            {
              onConflict: 'affiliate_id, sale_month, sale_year',
            }
          );

          if (error) {
            errorCount++;
          } else {
            successCount++;
          }
        }
      } else if (importType === 'affiliates') {
        for (const row of rows) {
          const cols = row.split(',').map((c) => c.trim());
          const data: Record<string, string> = {};
          headers.forEach((h, i) => {
            data[h] = cols[i] || '';
          });

          const password = 'branerfit123';
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              email: data.email,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: data.full_name,
                role: 'affiliate',
              },
            });

          if (authError || !authData.user) {
            errorCount++;
            continue;
          }

          const { error: affiliateError } = await supabase
            .from('affiliates')
            .insert({
              user_id: authData.user.id,
              name: data.name,
              tiktok_username: data.tiktok_username || null,
              phone: data.phone || null,
            });

          if (affiliateError) {
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      toast.success(
        `Import selesai: ${successCount} berhasil, ${errorCount} gagal`
      );
    } catch {
      toast.error('Gagal memproses file. Pastikan format CSV benar.');
    }

    setLoading(false);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Data</h1>
        <p className="text-muted-foreground">
          Import data aktivitas, penjualan, atau affiliate dari file CSV
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import Type */}
          <div className="space-y-2">
            <Label>Tipe Data</Label>
            <div className="flex gap-2">
              <Button
                variant={importType === 'activities' ? 'default' : 'outline'}
                onClick={() => setImportType('activities')}
                size="sm"
              >
                Aktivitas
              </Button>
              <Button
                variant={importType === 'sales' ? 'default' : 'outline'}
                onClick={() => setImportType('sales')}
                size="sm"
              >
                Penjualan
              </Button>
              <Button
                variant={importType === 'affiliates' ? 'default' : 'outline'}
                onClick={() => setImportType('affiliates')}
                size="sm"
              >
                Affiliate Baru
              </Button>
            </div>
          </div>

          <Separator />

          {/* Template Download */}
          <div className="space-y-2">
            <Label>Template CSV</Label>
            <p className="text-sm text-muted-foreground">
              Download template CSV terlebih dahulu untuk melihat format yang benar.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File CSV</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button
                onClick={handleImport}
                disabled={!file || loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Mengimport...' : 'Import'}
              </Button>
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium">Format CSV yang diharapkan:</h4>
            {importType === 'activities' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Kolom:</strong> affiliate_name, activity_type, activity_date, description</p>
                <p><strong>activity_type:</strong> upload_video, shopee_video, weekly_3_videos, weekly_5_videos, streak_3_days, streak_7_days</p>
                <p><strong>activity_date:</strong> YYYY-MM-DD</p>
              </div>
            )}
            {importType === 'sales' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Kolom:</strong> affiliate_name, checkout_count, sale_month, sale_year</p>
                <p><strong>sale_month:</strong> 1-12</p>
                <p><strong>sale_year:</strong> 2024, 2025, dst.</p>
              </div>
            )}
            {importType === 'affiliates' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Kolom:</strong> full_name, email, name, tiktok_username, phone</p>
                <p><strong>Catatan:</strong> Akun akan dibuat dengan password default "branerfit123"</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
