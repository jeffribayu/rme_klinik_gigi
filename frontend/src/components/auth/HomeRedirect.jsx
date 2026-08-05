import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dashboardPath } from '@/lib/dashboardPaths';

export default function HomeRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={dashboardPath(role)} replace />;
}
