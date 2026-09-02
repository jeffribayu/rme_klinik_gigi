import { query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';
import { getDoctorIdForUser } from '../middleware/auth.js';

export const listDoctorSalaries = asyncHandler(async (req, res) => {
  if (req.user.role === 'doctor') {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      throw new AppError('Akun belum terhubung ke data dokter. Hubungi admin.', 403);
    }
    const rows = await query(
      `SELECT ds.*, d.name AS doctor_name
       FROM doctor_salaries ds
       JOIN doctors d ON d.id = ds.doctor_id
       WHERE ds.doctor_id = ?
       ORDER BY ds.period_month DESC, ds.id DESC`,
      [doctorId]
    );
    return res.json({ success: true, data: rows });
  }

  if (req.user.role === 'admin') {
    const doctorFilter = req.query.doctor_id ? Number(req.query.doctor_id) : null;
    let sql = `SELECT ds.*, d.name AS doctor_name
       FROM doctor_salaries ds
       JOIN doctors d ON d.id = ds.doctor_id
       WHERE 1=1`;
    const params = [];
    if (doctorFilter) {
      sql += ' AND ds.doctor_id = ?';
      params.push(doctorFilter);
    }
    sql += ' ORDER BY ds.period_month DESC, ds.id DESC';
    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  }

  throw new AppError('Akses ditolak', 403);
});

function monthRange(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError('Parameter month wajib (format YYYY-MM)', 400);
  }

  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new AppError('Parameter month tidak valid', 400);
  }

  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: `${month}-01`,
    endExclusive: `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`,
  };
}

function parseCurrency(text) {
  const raw = String(text || '').replace(/[^\d]/g, '');
  return raw ? Number(raw) : 0;
}

function parseTreatmentLines(treatment) {
  const medicalServicePercent = 40;
  return String(treatment || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tariffMatch = line.match(/tarif\s+Rp\s*([\d.]+)/i);
      const frequencyMatch = line.match(/frekuensi\s+(\d+)/i);
      const staffMatch = line.match(/(?:petugas|asisten|perawat)\s+([^,]+)/i);
      const tariff = tariffMatch ? parseCurrency(tariffMatch[1]) : 0;
      const frequency = frequencyMatch ? Number(frequencyMatch[1]) || 1 : 1;
      const doctorService = Math.round((tariff * medicalServicePercent) / 100);
      const actionName = line
        .replace(/,\s*frekuensi\s+\d+/i, '')
        .replace(/,\s*(?:petugas|asisten|perawat)\s+[^,]+/i, '')
        .replace(/,\s*tarif\s+Rp\s*[\d.]+/i, '')
        .trim();

      return {
        actionName,
        frequency,
        staff_name: staffMatch?.[1]?.trim() || '-',
        tariff,
        deduction: Math.max(0, tariff - doctorService),
        medical_service_percent: medicalServicePercent,
        doctor_service: doctorService,
      };
    });
}

export const listDoctorSalaryActions = asyncHandler(async (req, res) => {
  const { start, endExclusive } = monthRange(req.query.month);
  let doctorId = null;

  if (req.user.role === 'doctor') {
    doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      throw new AppError('Akun belum terhubung ke data dokter. Hubungi admin.', 403);
    }
  } else if (req.user.role === 'admin') {
    doctorId = req.query.doctor_id ? Number(req.query.doctor_id) : null;
  } else {
    throw new AppError('Akses ditolak', 403);
  }

  const params = [start, endExclusive];
  let whereDoctor = '';
  if (doctorId) {
    whereDoctor = ' AND mr.doctor_id = ?';
    params.push(doctorId);
  }

  const records = await query(
    `SELECT mr.id, mr.visit_date, mr.treatment,
            p.name AS patient_name, p.patient_code,
            d.name AS doctor_name
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     JOIN doctors d ON d.id = mr.doctor_id
     WHERE mr.visit_date >= ? AND mr.visit_date < ?
       AND mr.treatment IS NOT NULL
       AND mr.treatment <> ''
       AND EXISTS (
         SELECT 1
         FROM payments py
         WHERE py.medical_record_id = mr.id
           AND py.payment_status = 'lunas'
       )
       ${whereDoctor}
     ORDER BY mr.visit_date ASC, mr.id ASC`,
    params
  );

  const rows = records.flatMap((record) =>
    parseTreatmentLines(record.treatment)
      .filter((item) => item.actionName)
      .map((item, index) => ({
        id: `${record.id}-${index}`,
        medical_record_id: record.id,
        visit_date: record.visit_date,
        patient_name: record.patient_name,
        patient_code: record.patient_code,
        doctor_name: record.doctor_name,
        ...item,
      }))
  );

  res.json({ success: true, data: rows });
});

export const createDoctorSalary = asyncHandler(async (req, res) => {
  const { doctor_id, period_month, amount, notes } = req.body;
  const r = await execute(
    `INSERT INTO doctor_salaries (doctor_id, period_month, amount, notes)
     VALUES (?, ?, ?, ?)`,
    [
      doctor_id,
      period_month,
      amount,
      notes ? sanitizeString(notes, 2000) : null,
    ]
  );
  const rows = await query('SELECT ds.*, d.name AS doctor_name FROM doctor_salaries ds JOIN doctors d ON d.id = ds.doctor_id WHERE ds.id = ?', [
    r.insertId,
  ]);
  res.status(201).json({ success: true, data: rows[0] });
});

export const deleteDoctorSalary = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await execute('DELETE FROM doctor_salaries WHERE id = ?', [id]);
  if (!result.affectedRows) throw new AppError('Entri tidak ditemukan', 404);
  res.json({ success: true, message: 'Entri gaji dihapus' });
});
