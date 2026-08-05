import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Moon,
  Sun,
  ClipboardList,
  Banknote,
  Pill,
  ChevronDown,
  UserPlus,
  Stethoscope,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { dashboardPath, ROLE_LABELS } from '@/lib/dashboardPaths';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function buildNav(role) {
  const dash = dashboardPath(role);

  if (role === 'admin') {
    return [
      { to: dash, icon: LayoutDashboard, label: 'Dashboard Admin', end: true },
      {
        to: '/patients',
        icon: Users,
        label: 'Pasien',
        children: [
          { to: '/patients', icon: Users, label: 'Data Pasien' },
          { to: '/patients/new', icon: UserPlus, label: 'Tambah Pasien' },
          { to: '/appointments', icon: CalendarDays, label: 'Jadwal Pasien' },
          { to: '/medical-records', icon: FileText, label: 'Rekam Medis' },
        ],
      },
      {
        to: '/payments',
        icon: CreditCard,
        label: 'Pembayaran',
        children: [
          { to: '/payments', icon: CreditCard, label: 'Transaksi' },
          { to: '/pendapatan', icon: WalletCards, label: 'Pendapatan' },
        ],
      },
      {
        to: '/settings/doctors',
        icon: Stethoscope,
        label: 'Dokter',
        children: [
          { to: '/settings/doctors', icon: Stethoscope, label: 'Data Dokter' },
          { to: '/absensi', icon: ClipboardList, label: 'Absensi' },
          { to: '/gaji-dokter', icon: Banknote, label: 'Penggajian' },
        ],
      },
      {
        to: '/settings/treatments',
        icon: Settings,
        label: 'Master Data',
        children: [
          { to: '/settings/treatments', icon: ClipboardList, label: 'Tindakan' },
          { to: '/obat', icon: Pill, label: 'Obat' },
          { to: '/settings/users', icon: Users, label: 'Manajemen Pengguna' },
        ],
      },
      { to: '/reports', icon: BarChart3, label: 'Laporan' },
      { to: '/settings/profile', icon: Settings, label: 'Profil' },
    ];
  }

  if (role === 'doctor') {
    return [
      { to: dash, icon: LayoutDashboard, label: 'Dashboard', end: true },
      {
        to: '/medical-records',
        icon: FileText,
        label: 'Rekam Medis',
        children: [
          { to: '/patients', icon: Users, label: 'Data Pasien' },
          { to: '/patients/new', icon: UserPlus, label: 'Form Pasien Baru' },
        ],
      },
      { to: '/appointments', icon: CalendarDays, label: 'Antrian Pasien' },
      { to: '/absensi', icon: ClipboardList, label: 'Absensi' },
      { to: '/gaji-dokter', icon: Banknote, label: 'Gaji Dokter' },
      {
        to: '/settings/profile',
        icon: Settings,
        label: 'Profil',
        children: [
          { to: '/settings/profile', icon: Settings, label: 'Pengaturan Akun' },
        ],
      },
    ];
  }

  if (role === 'nurse') {
    return [
      { to: dash, icon: LayoutDashboard, label: 'Dashboard Perawat', end: true },
      {
        to: '/patients',
        icon: Users,
        label: 'Data Pasien',
        children: [
          { to: '/patients', icon: Users, label: 'Data Pasien' },
          { to: '/patients/new', icon: UserPlus, label: 'Form Pasien Baru' },
        ],
      },
      { to: '/appointments', icon: CalendarDays, label: 'Antrian Pasien' },
      { to: '/payments', icon: WalletCards, label: 'Pembayaran' },
      { to: '/absensi', icon: ClipboardList, label: 'Absensi' },
      {
        to: '/settings/profile',
        icon: Settings,
        label: 'Profil',
        children: [
          { to: '/settings/profile', icon: Settings, label: 'Pengaturan Akun' },
        ],
      },
    ];
  }

  return [{ to: dash, icon: LayoutDashboard, label: 'Dashboard', end: true }];
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout, token, setUser } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isDoctorLayout = user?.role === 'doctor';

  const nav = useMemo(() => buildNav(user?.role), [user?.role]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get('/api/v1/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, setUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50/70 to-emerald-50/80 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-[min(18rem,calc(100vw-1.5rem))] flex-col border-r border-teal-200/50 shadow-card backdrop-blur-xl transition-transform dark:border-teal-900/40 lg:w-72 lg:translate-x-0',
          isDoctorLayout
            ? 'bg-white dark:bg-slate-950'
            : 'bg-gradient-to-b from-white via-teal-50/40 to-emerald-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <Link
          to={user?.role ? dashboardPath(user.role) : '/'}
          className="flex items-center gap-3 px-6 py-6 transition-opacity hover:opacity-90"
          onClick={() => setOpen(false)}
        >
          <img
            src="/assets/logo.png"
            alt="Logo"
            className="h-11 w-11 rounded-xl"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600/90 dark:text-teal-400/90">
              RME Linsea
            </p>
            <p className="bg-gradient-to-r from-teal-700 to-cyan-600 bg-clip-text text-lg font-bold text-transparent dark:from-teal-300 dark:to-cyan-300">
              Klinik Gigi
            </p>
          </div>
        </Link>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => {
            const childActive = item.children?.some(
              (child) =>
                location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
            );
            const parentActive = item.children
              ? location.pathname === item.to || childActive
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <div key={item.to} className="space-y-1">
                <NavLink
                  to={item.to}
                  end={item.end === true}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium uppercase transition-all duration-200',
                      isDoctorLayout ? 'rounded-md' : 'rounded-xl',
                      isActive || parentActive
                        ? isDoctorLayout
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-emerald-500/15 text-teal-800 shadow-sm ring-1 ring-teal-400/25 dark:from-teal-500/25 dark:via-cyan-500/20 dark:to-teal-600/20 dark:text-teal-50 dark:ring-teal-500/30'
                        : 'text-muted-foreground hover:bg-teal-500/10 hover:text-teal-900 dark:hover:bg-teal-950/50 dark:hover:text-teal-100'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive || parentActive
                            ? isDoctorLayout
                              ? 'text-white'
                              : 'text-teal-600 dark:text-teal-300'
                            : 'text-teal-600/55 dark:text-teal-500/50'
                        )}
                      />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.children && (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform',
                            parentActive ? 'rotate-0' : '-rotate-90'
                          )}
                        />
                      )}
                    </>
                  )}
                </NavLink>

                {item.children && parentActive && (
                  <div className={cn('space-y-1', isDoctorLayout ? 'ml-0 pl-0' : 'ml-6 border-l border-teal-200/70 pl-2 dark:border-teal-800/50')}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.to === '/patients'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium uppercase transition-all duration-200',
                            isActive
                              ? 'bg-teal-500 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950'
                              : 'text-muted-foreground hover:bg-teal-500/10 hover:text-teal-900 dark:hover:bg-teal-950/50 dark:hover:text-teal-100'
                          )
                        }
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-teal-200/40 p-4 dark:border-teal-900/40">
          <Link
            to="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex gap-3 rounded-xl border border-teal-100/80 bg-gradient-to-br from-teal-50/90 to-cyan-50/50 px-4 py-3 shadow-sm transition-opacity hover:opacity-90 dark:border-teal-800/40 dark:from-teal-950/40 dark:to-slate-900/80"
          >
            <UserAvatar user={user} className="h-10 w-10 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Masuk sebagai</p>
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="text-xs text-primary">
                {user?.role ? ROLE_LABELS[user.role] || user.role : ''}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-teal-200/40 bg-white/75 px-3 py-2 shadow-sm shadow-teal-900/5 backdrop-blur-xl dark:border-teal-900/35 dark:bg-slate-900/80 sm:gap-4 sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden min-w-0 items-center gap-3 sm:flex"
            >
              <UserAvatar user={user} className="h-9 w-9 text-xs" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Selamat datang,</p>
                <p className="truncate font-semibold">{user?.name}</p>
              </div>
            </motion.div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => toggle()} aria-label="Toggle tema">
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-10 gap-2 rounded-full border-teal-200/70 px-2 shadow-sm dark:border-teal-800/60 sm:px-4"
                >
                  <UserAvatar user={user} className="h-6 w-6 text-[10px] sm:hidden" />
                  <span className="hidden max-w-[200px] truncate sm:inline">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="py-1">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
