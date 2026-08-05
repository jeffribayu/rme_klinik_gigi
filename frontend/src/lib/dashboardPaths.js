/** Prefix URL untuk dashboard berdasarkan role JWT (admin | doctor | nurse). */
export function dashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'nurse') return '/nurse/dashboard';
  return '/login';
}

/** Label peran untuk UI */
export const ROLE_LABELS = {
  admin: 'Administrator',
  doctor: 'Dokter',
  nurse: 'Perawat',
};
