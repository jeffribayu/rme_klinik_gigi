import { api } from '@/api/client';

/**
 * Autentikasi — memakai prefix API yang sama dengan aplikasi (/api/v1).
 */
export async function loginRequest({ email, password, remember }) {
  const { data } = await api.post('/api/v1/auth/login', {
    email,
    password,
    remember,
  });
  return data;
}

export async function forgotPasswordRequest(payload) {
  const { data } = await api.post('/api/v1/auth/forgot-password', payload);
  return data;
}

export async function resetPasswordRequest(payload) {
  const { data } = await api.post('/api/v1/auth/reset-password', payload);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/api/v1/auth/me');
  return data;
}
