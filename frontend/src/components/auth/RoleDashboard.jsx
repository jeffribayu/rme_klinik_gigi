import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dashboardPath } from '@/lib/dashboardPaths';
import Dashboard from '@/pages/dashboard/Dashboard';

/** Memastikan URL dashboard (/admin|doctor|nurse/dashboard) cocok dengan JWT role. */
export default function RoleDashboard({ expectedRole }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return null;
  if (role !== expectedRole) {
    return <Navigate to={dashboardPath(role)} replace />;
  }
  return <Dashboard />;
}
