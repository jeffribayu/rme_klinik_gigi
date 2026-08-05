import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'rme-auth-storage' }
  )
);

export function canAccess(role, allowed) {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(role);
}
