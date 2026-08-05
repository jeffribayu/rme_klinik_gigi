import { query, execute, getPool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';

async function assertDoctorUserIdFree(userId, excludeDoctorId) {
  if (!userId) return;
  const rows = await query(
    'SELECT id FROM doctors WHERE user_id = ? AND id <> ?',
    [userId, excludeDoctorId ?? 0]
  );
  if (rows.length) {
    throw new AppError('Akun ini sudah terhubung ke dokter lain', 409);
  }
}

export const listDoctors = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, user_id, name, specialist, sip_number, phone, photo, created_at
     FROM doctors ORDER BY name ASC`
  );
  res.json({ success: true, data: rows });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const { name, specialist, sip_number, phone, user_id } = req.body;
  await assertDoctorUserIdFree(user_id, 0);
  let photo = null;
  if (req.file) {
    photo = `/uploads/doctors/${req.file.filename}`;
  }

  const result = await execute(
    `INSERT INTO doctors (user_id, name, specialist, sip_number, phone, photo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user_id || null,
      sanitizeString(name, 255),
      specialist ? sanitizeString(specialist, 255) : null,
      sip_number ? sanitizeString(sip_number, 100) : null,
      phone ? sanitizeString(phone, 50) : null,
      photo,
    ]
  );

  const rows = await query('SELECT * FROM doctors WHERE id = ?', [
    result.insertId,
  ]);
  res.status(201).json({ success: true, data: rows[0] });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await query('SELECT * FROM doctors WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Dokter tidak ditemukan', 404);

  const { name, specialist, sip_number, phone, user_id } = req.body;
  const nextUserId =
    user_id !== undefined ? user_id : existing[0].user_id;
  await assertDoctorUserIdFree(nextUserId, id);
  let photo = existing[0].photo;
  if (req.file) {
    photo = `/uploads/doctors/${req.file.filename}`;
  }

  await query(
    `UPDATE doctors SET user_id = ?, name = ?, specialist = ?, sip_number = ?, phone = ?, photo = ?
     WHERE id = ?`,
    [
      nextUserId,
      sanitizeString(name, 255),
      specialist ? sanitizeString(specialist, 255) : null,
      sip_number ? sanitizeString(sip_number, 100) : null,
      phone ? sanitizeString(phone, 50) : null,
      photo,
      id,
    ]
  );

  const rows = await query('SELECT * FROM doctors WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await query('SELECT id, photo FROM doctors WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Dokter tidak ditemukan', 404);

  const usedInMedicalRecords = await query(
    'SELECT COUNT(*) AS total FROM medical_records WHERE doctor_id = ?',
    [id]
  );
  if (Number(usedInMedicalRecords[0]?.total || 0) > 0) {
    throw new AppError(
      'Tidak dapat menghapus dokter yang masih dipakai di rekam medis. Pindahkan rekam medis ke dokter lain terlebih dahulu.',
      409
    );
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM appointments WHERE doctor_id = ?', [id]);
    await conn.execute('DELETE FROM doctors WHERE id = ?', [id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    if (e.errno === 1451 || e.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new AppError(
        'Tidak dapat menghapus dokter yang masih direferensikan data lain. Hapus atau pindahkan data terkait terlebih dahulu.',
        409
      );
    }
    throw e;
  } finally {
    conn.release();
  }

  res.json({ success: true, message: 'Data dokter dihapus permanen dari basis data' });
});
