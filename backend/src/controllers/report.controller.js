import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Data untuk ekspor PDF/Excel di frontend */
function monthWhere(req, column, params) {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return '';
  params.push(month);
  return ` AND DATE_FORMAT(${column}, '%Y-%m') = ?`;
}

export const patientsReport = asyncHandler(async (req, res) => {
  const params = [];
  const rows = await query(
    `SELECT patient_code, nik, name, gender, birth_date, phone, address, blood_type, created_at, updated_at
     FROM patients
     WHERE 1=1${monthWhere(req, 'created_at', params)}
     ORDER BY created_at DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

export const paymentsReport = asyncHandler(async (req, res) => {
  const params = [];
  const rows = await query(
    `SELECT py.id, py.total_price, py.payment_method, py.payment_status, py.created_at,
            p.patient_code, p.name AS patient_name, p.phone AS patient_phone,
            mr.id AS medical_record_id, mr.visit_date, mr.diagnosis, mr.treatment,
            d.name AS doctor_name
     FROM payments py
     JOIN medical_records mr ON mr.id = py.medical_record_id
     JOIN patients p ON p.id = mr.patient_id
     JOIN doctors d ON d.id = mr.doctor_id
     WHERE 1=1${monthWhere(req, 'py.created_at', params)}
     ORDER BY py.created_at DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

export const medicalRecordsReport = asyncHandler(async (req, res) => {
  const params = [];
  const rows = await query(
    `SELECT mr.id, mr.visit_date, mr.complaint, mr.diagnosis, mr.treatment, mr.notes, mr.created_at,
            p.patient_code, p.name AS patient_name, p.gender AS patient_gender,
            p.birth_date AS patient_birth_date, p.phone AS patient_phone,
            d.name AS doctor_name
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     JOIN doctors d ON d.id = mr.doctor_id
     WHERE 1=1${monthWhere(req, 'mr.visit_date', params)}
     ORDER BY mr.visit_date DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

export const appointmentsReport = asyncHandler(async (req, res) => {
  const params = [];
  const rows = await query(
    `SELECT a.appointment_date, a.queue_number, a.status,
            p.patient_code, p.name AS patient_name, d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     WHERE 1=1${monthWhere(req, 'a.appointment_date', params)}
     ORDER BY a.appointment_date DESC`,
    params
  );
  res.json({ success: true, data: rows });
});
