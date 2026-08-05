import bcrypt from 'bcryptjs';
import { query, execute, getPool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';

/** Daftar untuk admin: hanya dokter & perawat (bukan admin). */
export const listUsers = asyncHandler(async (req, res) => {
  const roleFilter = req.query.role;
  let sql = `SELECT id, name, email, phone, role,
              COALESCE(is_active, 1) AS is_active,
              created_at, updated_at
     FROM users
     WHERE role IN ('doctor', 'nurse')`;
  const params = [];
  if (roleFilter === 'doctor' || roleFilter === 'nurse') {
    sql += ' AND role = ?';
    params.push(roleFilter);
  }
  sql += ' ORDER BY name ASC';
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
});

export const listNurses = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, name, email, phone
     FROM users
     WHERE role = 'nurse'
       AND COALESCE(is_active, 1) = 1
     ORDER BY name ASC`
  );
  res.json({ success: true, data: rows });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, is_active } = req.body;
  const emailNorm = email.toLowerCase().trim();

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
  if (existing.length) throw new AppError('Email sudah dipakai pengguna lain', 409);

  const nameNorm = sanitizeString(name, 255);
  const phoneNorm = sanitizeString(String(phone || '').trim(), 50);
  const passwordHash = await bcrypt.hash(password, 10);
  const active = is_active ? 1 : 0;

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [insertResult] = await conn.execute(
      `INSERT INTO users (name, email, password, phone, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nameNorm, emailNorm, passwordHash, phoneNorm, role, active]
    );
    const userId = insertResult.insertId;

    if (role === 'doctor') {
      await conn.execute(
        `INSERT INTO doctors (user_id, name, specialist, sip_number, phone, photo)
         VALUES (?, ?, NULL, NULL, ?, NULL)`,
        [userId, nameNorm, phoneNorm]
      );
    }

    await conn.commit();
    const [rows] = await conn.execute(
      `SELECT id, name, email, phone, role,
              COALESCE(is_active, 1) AS is_active,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export const updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone, is_active } = req.body;

  const existing = await query('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Pengguna tidak ditemukan', 404);
  if (existing[0].role === 'admin') {
    throw new AppError('Akun admin tidak dapat diubah dari halaman ini', 403);
  }

  const emailNorm = email.toLowerCase().trim();
  const dup = await query(
    'SELECT id FROM users WHERE email = ? AND id <> ?',
    [emailNorm, id]
  );
  if (dup.length) throw new AppError('Email sudah dipakai pengguna lain', 409);

  const phoneVal =
    phone === undefined || phone === null || String(phone).trim() === ''
      ? null
      : sanitizeString(String(phone).trim(), 50);

  await execute(
    `UPDATE users SET name = ?, email = ?, phone = ?, is_active = ? WHERE id = ?`,
    [
      sanitizeString(name, 255),
      emailNorm,
      phoneVal,
      is_active ? 1 : 0,
      id,
    ]
  );

  const rows = await query(
    `SELECT id, name, email, phone, role,
            COALESCE(is_active, 1) AS is_active,
            created_at, updated_at
     FROM users WHERE id = ?`,
    [id]
  );
  res.json({ success: true, data: rows[0] });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  const existing = await query('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Pengguna tidak ditemukan', 404);
  if (existing[0].role === 'admin') {
    throw new AppError('Password akun admin tidak dapat direset dari halaman ini', 403);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await execute(
    `UPDATE users
     SET password = ?,
         reset_password_token_hash = NULL,
         reset_password_expires_at = NULL
     WHERE id = ?`,
    [passwordHash, id]
  );

  res.json({ success: true, message: 'Password pengguna berhasil direset' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    throw new AppError('Tidak dapat menghapus akun sendiri', 400);
  }

  const existing = await query('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Pengguna tidak ditemukan', 404);
  if (existing[0].role === 'admin') {
    throw new AppError('Akun admin tidak dapat dihapus dari halaman ini', 403);
  }

  try {
    await execute('DELETE FROM users WHERE id = ?', [id]);
  } catch (e) {
    if (e.errno === 1451 || e.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new AppError(
        'Tidak dapat menghapus pengguna yang masih direferensi sistem. Lepaskan tautan dokter atau data terkait terlebih dahulu.',
        409
      );
    }
    throw e;
  }

  res.json({ success: true, message: 'Pengguna dihapus permanen dari basis data' });
});
