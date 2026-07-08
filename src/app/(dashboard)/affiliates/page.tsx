'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatPoints, formatDate } from '@/lib/utils';
import { UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AffiliateData {
  id: string;
  user_id: string;
  name: string;
  tiktok_username: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  total_points: number;
  current_tier: string | null;
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // New affiliate form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliateName, setAffiliateName] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function loadAffiliates() {
    const { data: affiliatesData } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!affiliatesData) {
      setLoading(false);
      return;
    }

    const withPoints: AffiliateData[] = [];

    for (const aff of affiliatesData ?? []) {
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

      const contentPoints =
        activities?.reduce((s, a) => s + a.points, 0) || 0;
      const salesPoints = sales?.reduce((s, a) => s + a.points, 0) || 0;
      const total = contentPoints + salesPoints;

      const tiers = [
        { name: 'Branerfit Champion', min: 50000 },
        { name: 'Diamond Affiliate', min: 30000 },
        { name: 'Gold Affiliate', min: 15000 },
        { name: 'Silver Affiliate', min: 7000 },
        { name: 'Bronze Affiliate', min: 3000 },
        { name: 'Rising Affiliate', min: 1000 },
      ];

      let currentTier: string | null = null;
      for (const t of tiers) {
        if (total >= t.min) {
          currentTier = t.name;
          break;
        }
      }

      withPoints.push({
        ...aff,
        total_points: total,
        current_tier: currentTier,
      });
    }

    setAffiliates(withPoints);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      await loadAffiliates();
    }
    init();
  });

  async function handleAddAffiliate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const password = 'branerfit123';

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'affiliate',
        },
      });

    if (authError || !authData.user) {
      toast.error(authError?.message || 'Gagal membuat akun');
      setSaving(false);
      return;
    }

    const { error: affiliateError } = await supabase.from('affiliates').insert(
      {
        user_id: authData.user.id,
        name: affiliateName,
        tiktok_username: tiktokUsername || null,
        phone: phone || null,
      }
    );

    if (affiliateError) {
      toast.error('Gagal menambahkan affiliate');
      setSaving(false);
      return;
    }

    toast.success('Affiliate berhasil ditambahkan');
    setDialogOpen(false);
    setFullName('');
    setEmail('');
    setAffiliateName('');
    setTiktokUsername('');
    setPhone('');
    setSaving(false);
    loadAffiliates();
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('affiliates')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Gagal mengubah status');
      return;
    }

    toast.success(`Status berhasil diubah`);
    loadAffiliates();
  }

  const filteredAffiliates = affiliates.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tiktok_username || '')
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Affiliate</h1>
          <p className="text-muted-foreground">
            Kelola data affiliate Branerfit
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah Affiliate
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Affiliate Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAffiliate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email (untuk login)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Password default: <code>branerfit123</code>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nama Affiliate</Label>
                <Input
                  value={affiliateName}
                  onChange={(e) => setAffiliateName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>TikTok Username</Label>
                <Input
                  value={tiktokUsername}
                  onChange={(e) => setTiktokUsername(e.target.value)}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari affiliate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAffiliates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search
                ? 'Tidak ada hasil'
                : 'Belum ada affiliate. Tambahkan affiliate baru.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>TikTok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total Poin</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.tiktok_username ? `@${a.tiktok_username}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.status === 'active' ? 'default' : 'secondary'}
                        className={
                          a.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }
                      >
                        {a.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.current_tier || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPoints(a.total_points)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(a.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(a.id, a.status)}
                      >
                        {a.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
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
