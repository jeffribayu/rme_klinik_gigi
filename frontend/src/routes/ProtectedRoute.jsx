import { useLayoutEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, canAccess } from '@/store/authStore';

/** Keluar dari sesi jika JWT menyimpan peran legacy yang tidak dipakai lagi. */
function LegacyRoleKick() {
  const logout = useAuthStore((s) => s.logout);
  useLayoutEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace state={{ notice: 'legacy-role' }} />;
}

export function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const legacy = ['dokter', 'resepsionis'];
  if (user?.role && legacy.includes(user.role)) {
    return <LegacyRoleKick />;
  }

  if (roles?.length && user && !canAccess(user.role, roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
