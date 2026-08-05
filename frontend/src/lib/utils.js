import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function todayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(d) {
  if (typeof d !== 'string') return d;
  const match = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(d);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDate(d) {
  if (!d) return '-';
  const date = parseDateOnly(d);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateISO(d) {
  if (!d) return '-';
  const date = parseDateOnly(d);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Umur dalam tahun dari tanggal lahir (YYYY-MM-DD). */
export function ageFromBirthDate(isoDate) {
  if (!isoDate) return null;
  const d = parseDateOnly(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
}

export function formatDateTime(d) {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Jam dari kolom TIME MySQL / string "HH:MM:SS" untuk tampilan absensi. */
export function formatAttendanceClock(t) {
  if (t == null || t === '') return '—';
  const s = typeof t === 'string' ? t : String(t);
  if (s.length >= 5) return `${s.slice(0, 5)} WIB`;
  return `${s} WIB`;
}

/** URL untuk file statis backend (mis. foto dokter di /uploads/...). */
export function publicAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
