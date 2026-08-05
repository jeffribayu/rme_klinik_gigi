import { query, getPool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';

async function generatePatientCode(conn) {
  const prefix = `PAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM patients WHERE patient_code LIKE ?',
    [`${prefix}%`]
  );
  const n = (rows[0]?.c || 0) + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

export const listPatients = asyncHandler(async (req, res) => {
  const { page, limit, search, gender } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';
  if (search) {
    where += ' AND (name LIKE ? OR patient_code LIKE ? OR nik LIKE ? OR phone LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (gender) {
    where += ' AND gender = ?';
    params.push(gender);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM patients ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const listParams = [...params, limit, offset];
  const rows = await query(
    `SELECT id, patient_code, nik, name, gender, birth_date, phone, address, blood_type, created_at, updated_at
     FROM patients ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    listParams
  );

  res.json({
    success: true,
    data: rows,
    meta: { page, limit, total },
  });
});

export const getPatient = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM patients WHERE id = ?', [id]);
  const patient = rows[0];
  if (!patient) throw new AppError('Pasien tidak ditemukan', 404);
  res.json({ success: true, data: patient });
});

export const createPatient = asyncHandler(async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const code = await generatePatientCode(conn);

    const {
      nik,
      name,
      gender,
      birth_date,
      phone,
      address,
      blood_type,
    } = req.body;

    const [result] = await conn.execute(
      `INSERT INTO patients (patient_code, nik, name, gender, birth_date, phone, address, blood_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        nik ? sanitizeString(nik, 32) : null,
        sanitizeString(name, 255),
        gender,
        birth_date,
        phone ? sanitizeString(phone, 50) : null,
        address ? sanitizeString(address, 2000) : null,
        blood_type ? sanitizeString(blood_type, 8) : null,
      ]
    );

    await conn.commit();
    const rows = await query('SELECT * FROM patients WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export const updatePatient = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const {
    nik,
    name,
    gender,
    birth_date,
    phone,
    address,
    blood_type,
  } = req.body;

  const existing = await query('SELECT id FROM patients WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Pasien tidak ditemukan', 404);

  await query(
    `UPDATE patients SET nik = ?, name = ?, gender = ?, birth_date = ?, phone = ?, address = ?, blood_type = ?
     WHERE id = ?`,
    [
      nik ? sanitizeString(nik, 32) : null,
      sanitizeString(name, 255),
      gender,
      birth_date,
      phone ? sanitizeString(phone, 50) : null,
      address ? sanitizeString(address, 2000) : null,
      blood_type ? sanitizeString(blood_type, 8) : null,
      id,
    ]
  );

  const rows = await query('SELECT * FROM patients WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const r = await query('DELETE FROM patients WHERE id = ?', [id]);
  if (!r.affectedRows) throw new AppError('Pasien tidak ditemukan', 404);
  res.json({ success: true, message: 'Pasien dihapus' });
});
