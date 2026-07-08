'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  LayoutDashboard,
  ClipboardPlus,
  Upload,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileText,
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Input Aktivitas', href: '/dashboard/activities', icon: <ClipboardPlus className="h-4 w-4" /> },
  { label: 'Import Data', href: '/dashboard/import', icon: <Upload className="h-4 w-4" />, adminOnly: true },
  { label: 'Affiliate', href: '/dashboard/affiliates', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Laporan', href: '/dashboard/reports', icon: <FileText className="h-4 w-4" />, adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authUser.id)
        .single();

      setUser({
        email: authUser.email || '',
        role: profile?.role || 'affiliate',
        name: profile?.full_name || authUser.email || '',
      });
    }
    getUser();
  }, [supabase, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const filteredLinks = NAV_LINKS.filter(
    (link) => !link.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Branerfit</h1>
                <p className="text-xs text-muted-foreground">Rewards Program</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === link.href
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-200">
            {user && (
              <div className="mb-3 px-3">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize">
                  {user.role}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-600 hover:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 p-4 bg-white border-b border-slate-200">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-1.5 rounded-lg">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Branerfit</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
