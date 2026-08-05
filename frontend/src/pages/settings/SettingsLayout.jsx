import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ClipboardList, User, Stethoscope, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const subNav = [
  { to: '/settings/profile', label: 'Profil', icon: User, adminOnly: false },
  { to: '/settings/doctors', label: 'Dokter', icon: Stethoscope, adminOnly: true },
  { to: '/settings/treatments', label: 'Tindakan', icon: ClipboardList, adminOnly: true },
  { to: '/settings/users', label: 'Pengguna', icon: UsersRound, adminOnly: true },
];

export default function SettingsLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (
    role !== 'admin' &&
    (location.pathname === '/settings/doctors' ||
      location.pathname === '/settings/treatments' ||
      location.pathname === '/settings/users')
  ) {
    return <Navigate to="/settings/profile" replace />;
  }

  const links = subNav.filter((l) => !l.adminOnly || role === 'admin');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Profil akun Anda (termasuk data dokter bila peran dokter); admin mengelola daftar master
          dokter dan pengguna.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
