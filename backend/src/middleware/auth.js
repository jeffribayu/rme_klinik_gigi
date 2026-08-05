import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { query } from '../config/db.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Token tidak ditemukan', 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    throw new AppError('Token tidak valid atau kadaluarsa', 401);
  }
}

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    /* ignore */
  }
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError('Akses ditolak untuk peran Anda', 403);
    }
    next();
  };
}

/** Ensure dokter user maps to doctors row when needed */
export async function getDoctorIdForUser(userId) {
  const rows = await query(
    'SELECT id FROM doctors WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.id ?? null;
}
