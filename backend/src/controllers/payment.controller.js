import { query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPayments = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const params = [];
  let where = 'WHERE 1=1';

  if (status) {
    where += ' AND py.payment_status = ?';
    params.push(status);
  }
  if (from) {
    where += ' AND DATE(py.created_at) >= ?';
    params.push(from);
  }
  if (to) {
    where += ' AND DATE(py.created_at) <= ?';
    params.push(to);
  }

  const rows = await query(
    `SELECT py.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date, mr.treatment, p.name AS patient_name, p.patient_code, p.phone AS patient_phone
     FROM payments py
     JOIN medical_records mr ON mr.id = py.medical_record_id
     JOIN patients p ON p.id = mr.patient_id
     ${where}
     ORDER BY py.created_at DESC`,
    params
  );

  res.json({ success: true, data: rows });
});

export const createPayment = asyncHandler(async (req, res) => {
  const { medical_record_id, total_price, payment_method, payment_status } =
    req.body;

  const mr = await query('SELECT id FROM medical_records WHERE id = ?', [
    medical_record_id,
  ]);
  if (!mr.length) throw new AppError('Rekam medis tidak ditemukan', 404);

  const result = await execute(
    `INSERT INTO payments (medical_record_id, total_price, payment_method, payment_status)
     VALUES (?, ?, ?, ?)`,
    [medical_record_id, total_price, payment_method, payment_status]
  );

  const rows = await query(
    `SELECT py.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date, mr.treatment, p.name AS patient_name, p.patient_code, p.phone AS patient_phone
     FROM payments py
     JOIN medical_records mr ON mr.id = py.medical_record_id
     JOIN patients p ON p.id = mr.patient_id
     WHERE py.id = ?`,
    [result.insertId]
  );

  res.status(201).json({ success: true, data: rows[0] });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { total_price, payment_method, payment_status } = req.body;

  const existing = await query('SELECT id FROM payments WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Pembayaran tidak ditemukan', 404);

  await execute(
    `UPDATE payments SET total_price = ?, payment_method = ?, payment_status = ? WHERE id = ?`,
    [total_price, payment_method, payment_status, id]
  );

  const rows = await query(
    `SELECT py.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date, mr.treatment, p.name AS patient_name, p.patient_code, p.phone AS patient_phone
     FROM payments py
     JOIN medical_records mr ON mr.id = py.medical_record_id
     JOIN patients p ON p.id = mr.patient_id
     WHERE py.id = ?`,
    [id]
  );

  res.json({ success: true, data: rows[0] });
});
