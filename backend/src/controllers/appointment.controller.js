import { query, execute, getPool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function nextQueueNumber(conn, appointmentDate, doctorId) {
  let dateOnly =
    typeof appointmentDate === 'string'
      ? appointmentDate.slice(0, 10)
      : new Date(appointmentDate).toISOString().slice(0, 10);
  const dayStart = `${dateOnly} 00:00:00`;
  const dayEnd = `${dateOnly} 23:59:59`;
  const [rows] = await conn.execute(
    `SELECT COALESCE(MAX(queue_number), 0) + 1 AS n FROM appointments
     WHERE doctor_id = ? AND appointment_date >= ? AND appointment_date <= ?`,
    [doctorId, dayStart, dayEnd]
  );
  return rows[0]?.n ?? 1;
}

export const listAppointments = asyncHandler(async (req, res) => {
  const { date, status, doctor_id } = req.query;
  const params = [];
  let where = 'WHERE 1=1';

  if (date) {
    where += ' AND DATE(a.appointment_date) = ?';
    params.push(date);
  }
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (doctor_id) {
    where += ' AND a.doctor_id = ?';
    params.push(Number(doctor_id));
  }

  const rows = await query(
    `SELECT a.id, a.patient_id, a.doctor_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
            a.queue_number, a.status, a.created_at,
            p.name AS patient_name, p.patient_code, p.phone AS patient_phone,
            p.gender AS patient_gender, p.birth_date AS patient_birth_date,
            p.address AS patient_address, p.blood_type AS patient_blood_type,
            d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     ${where}
     ORDER BY a.appointment_date ASC, a.queue_number ASC`,
    params
  );

  res.json({ success: true, data: rows });
});

export const createAppointment = asyncHandler(async (req, res) => {
  const { patient_id, doctor_id, appointment_date, status } = req.body;

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const qn = await nextQueueNumber(conn, appointment_date, doctor_id);

    const [ins] = await conn.execute(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, queue_number, status)
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_date, qn, status || 'menunggu']
    );

    await conn.commit();

    const rows = await query(
      `SELECT a.id, a.patient_id, a.doctor_id,
              DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
              a.queue_number, a.status, a.created_at,
              p.name AS patient_name, p.patient_code, p.phone AS patient_phone,
              p.gender AS patient_gender, p.birth_date AS patient_birth_date,
              p.address AS patient_address, p.blood_type AS patient_blood_type,
              d.name AS doctor_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ?`,
      [ins.insertId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { patient_id, doctor_id, appointment_date, status } = req.body;

  const existing = await query('SELECT id FROM appointments WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Appointment tidak ditemukan', 404);

  await execute(
    `UPDATE appointments SET patient_id = ?, doctor_id = ?, appointment_date = ?, status = ? WHERE id = ?`,
    [patient_id, doctor_id, appointment_date, status, id]
  );

  const rows = await query(
    `SELECT a.id, a.patient_id, a.doctor_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
            a.queue_number, a.status, a.created_at,
            p.name AS patient_name, p.patient_code, p.phone AS patient_phone,
            p.gender AS patient_gender, p.birth_date AS patient_birth_date,
            p.address AS patient_address, p.blood_type AS patient_blood_type,
            d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.id = ?`,
    [id]
  );

  res.json({ success: true, data: rows[0] });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const existing = await query('SELECT id FROM appointments WHERE id = ?', [id]);
  if (!existing.length) throw new AppError('Appointment tidak ditemukan', 404);

  await execute('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);

  const rows = await query(
    `SELECT a.id, a.patient_id, a.doctor_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
            a.queue_number, a.status, a.created_at,
            p.name AS patient_name, p.patient_code, p.phone AS patient_phone,
            p.gender AS patient_gender, p.birth_date AS patient_birth_date,
            p.address AS patient_address, p.blood_type AS patient_blood_type,
            d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.id = ?`,
    [id]
  );

  res.json({ success: true, data: rows[0] });
});

export const deleteAppointment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const r = await execute('DELETE FROM appointments WHERE id = ?', [id]);
  if (!r.affectedRows) throw new AppError('Appointment tidak ditemukan', 404);
  res.json({ success: true, message: 'Appointment dihapus' });
});
