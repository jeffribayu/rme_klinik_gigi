import { query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';

export const listTreatments = asyncHandler(async (req, res) => {
  const activeOnly = req.query.active_only === '1' || req.query.active_only === 'true';
  const search = req.query.q?.trim();
  let sql = 'SELECT * FROM treatments WHERE 1=1';
  const params = [];
  if (activeOnly) sql += ' AND is_active = 1';
  if (search) {
    const like = `%${search}%`;
    sql += ' AND (name LIKE ? OR icd_code LIKE ? OR icd9_code LIKE ? OR tooth_element LIKE ?)';
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY name ASC';
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
});

export const createTreatment = asyncHandler(async (req, res) => {
  const { name, icd_code, icd9_code, tooth_element, price, is_active } = req.body;
  const nameClean = sanitizeString(name, 255);
  if (!nameClean) throw new AppError('Nama tindakan tidak boleh kosong', 422);

  const r = await execute(
    `INSERT INTO treatments (name, icd_code, icd9_code, tooth_element, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      nameClean,
      icd_code ? sanitizeString(icd_code, 50) : null,
      icd9_code ? sanitizeString(icd9_code, 50) : null,
      tooth_element ? sanitizeString(tooth_element, 100) : null,
      Math.max(0, Number(price) || 0),
      is_active ? 1 : 0,
    ]
  );
  const rows = await query('SELECT * FROM treatments WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
});

export const updateTreatment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, icd_code, icd9_code, tooth_element, price, is_active } = req.body;
  const nameClean = sanitizeString(name, 255);
  if (!nameClean) throw new AppError('Nama tindakan tidak boleh kosong', 422);

  const result = await execute(
    `UPDATE treatments
     SET name = ?, icd_code = ?, icd9_code = ?, tooth_element = ?, price = ?, is_active = ?
     WHERE id = ?`,
    [
      nameClean,
      icd_code ? sanitizeString(icd_code, 50) : null,
      icd9_code ? sanitizeString(icd9_code, 50) : null,
      tooth_element ? sanitizeString(tooth_element, 100) : null,
      Math.max(0, Number(price) || 0),
      is_active ? 1 : 0,
      id,
    ]
  );
  if (!result.affectedRows) throw new AppError('Tindakan tidak ditemukan', 404);
  const rows = await query('SELECT * FROM treatments WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
});

export const deleteTreatment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await execute('DELETE FROM treatments WHERE id = ?', [id]);
  if (!result.affectedRows) throw new AppError('Tindakan tidak ditemukan', 404);
  res.json({ success: true, message: 'Tindakan dihapus' });
});
