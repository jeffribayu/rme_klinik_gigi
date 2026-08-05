import { query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';

export const listMedicines = asyncHandler(async (req, res) => {
  const activeOnly =
    req.query.active_only === '1' || req.query.active_only === 'true';
  const search = req.query.q?.trim();
  let sql = 'SELECT * FROM medicines WHERE 1=1';
  const params = [];
  if (activeOnly) {
    sql += ' AND is_active = 1';
  }
  if (search) {
    const like = `%${search}%`;
    sql += ' AND (name LIKE ? OR strength LIKE ? OR form LIKE ? OR notes LIKE ?)';
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY name ASC';
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
});

export const createMedicine = asyncHandler(async (req, res) => {
  const { name, form, strength, notes, is_active, stock_qty } = req.body;
  const nameClean = sanitizeString(name, 255);
  if (!nameClean) {
    throw new AppError('Nama obat tidak boleh kosong', 422);
  }
  const stock = Math.max(0, Math.min(Number(stock_qty) || 0, 2147483647));

  const r = await execute(
    `INSERT INTO medicines (name, form, strength, notes, is_active, stock_qty)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      nameClean,
      form ? sanitizeString(form, 100) : null,
      strength ? sanitizeString(strength, 120) : null,
      notes ? sanitizeString(notes, 2000) : null,
      is_active ? 1 : 0,
      stock,
    ]
  );
  const rows = await query('SELECT * FROM medicines WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
});

export const updateMedicine = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, form, strength, notes, is_active, stock_qty } = req.body;
  const nameClean = sanitizeString(name, 255);
  if (!nameClean) {
    throw new AppError('Nama obat tidak boleh kosong', 422);
  }
  const stock = Math.max(0, Math.min(Number(stock_qty) || 0, 2147483647));

  const result = await execute(
    `UPDATE medicines SET name = ?, form = ?, strength = ?, notes = ?, is_active = ?, stock_qty = ? WHERE id = ?`,
    [
      nameClean,
      form ? sanitizeString(form, 100) : null,
      strength ? sanitizeString(strength, 120) : null,
      notes ? sanitizeString(notes, 2000) : null,
      is_active ? 1 : 0,
      stock,
      id,
    ]
  );
  if (!result.affectedRows) throw new AppError('Obat tidak ditemukan', 404);
  const rows = await query('SELECT * FROM medicines WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
});

/** Tambah/kurangi stok relatif (admin). Stok tidak boleh di bawah 0. */
export const adjustMedicineStock = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { delta } = req.body;
  const d = Math.trunc(delta);

  const result = await execute(
    `UPDATE medicines
     SET stock_qty = CAST(GREATEST(0, CAST(stock_qty AS SIGNED) + ?) AS UNSIGNED)
     WHERE id = ?`,
    [d, id]
  );
  if (!result.affectedRows) throw new AppError('Obat tidak ditemukan', 404);
  const rows = await query('SELECT * FROM medicines WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
});

export const deleteMedicine = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await execute('DELETE FROM medicines WHERE id = ?', [id]);
  if (!result.affectedRows) throw new AppError('Obat tidak ditemukan', 404);
  res.json({ success: true, message: 'Obat dihapus' });
});
