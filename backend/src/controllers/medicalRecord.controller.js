import { getPool, query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';
import { getDoctorIdForUser } from '../middleware/auth.js';

async function loadOdontograms(medicalRecordId) {
  return query(
    `SELECT id, medical_record_id, tooth_number, condition_type AS conditionType, notes, created_at
     FROM odontograms WHERE medical_record_id = ? ORDER BY tooth_number`,
    [medicalRecordId]
  );
}

async function loadPrescriptions(medicalRecordId) {
  return query(
    `SELECT id, medical_record_id, medicine_name, dosage, instruction, created_at
     FROM prescriptions WHERE medical_record_id = ? ORDER BY id`,
    [medicalRecordId]
  );
}

async function enforceDoctorOwnRecord(req, doctorId) {
  if (req.user?.role !== 'doctor') return doctorId;
  const ownedDoctorId = await getDoctorIdForUser(req.user.id);
  if (!ownedDoctorId) {
    throw new AppError('Akun dokter belum terhubung ke data dokter. Hubungi admin.', 403);
  }
  if (Number(doctorId) !== Number(ownedDoctorId)) {
    throw new AppError('Dokter hanya dapat menyimpan rekam medis atas nama akun sendiri', 403);
  }
  return ownedDoctorId;
}

export const listMedicalRecords = asyncHandler(async (req, res) => {
  const patientId = req.query.patient_id
    ? Number(req.query.patient_id)
    : null;
  const params = [];
  let where = 'WHERE 1=1';
  if (patientId) {
    where += ' AND mr.patient_id = ?';
    params.push(patientId);
  }

  const rows = await query(
    `SELECT mr.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
            p.name AS patient_name, p.patient_code, d.name AS doctor_name, d.photo AS doctor_photo
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     JOIN doctors d ON d.id = mr.doctor_id
     ${where}
     ORDER BY mr.visit_date DESC, mr.id DESC`,
    params
  );

  res.json({ success: true, data: rows });
});

export const getMedicalRecord = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query(
    `SELECT mr.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
            p.name AS patient_name, p.patient_code,
            p.birth_date AS patient_birth_date, p.gender AS patient_gender, p.phone AS patient_phone,
            p.address AS patient_address, p.nik AS patient_nik,
            d.name AS doctor_name, d.photo AS doctor_photo
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     JOIN doctors d ON d.id = mr.doctor_id
     WHERE mr.id = ?`,
    [id]
  );
  const mr = rows[0];
  if (!mr) throw new AppError('Rekam medis tidak ditemukan', 404);

  mr.odontograms = await loadOdontograms(id);
  mr.prescriptions = await loadPrescriptions(id);

  const pays = await query(
    'SELECT * FROM payments WHERE medical_record_id = ? ORDER BY id DESC',
    [id]
  );
  mr.payments = pays;

  res.json({ success: true, data: mr });
});

async function replaceOdontograms(conn, medicalRecordId, items) {
  await conn.execute('DELETE FROM odontograms WHERE medical_record_id = ?', [
    medicalRecordId,
  ]);
  for (const o of items) {
    await conn.execute(
      `INSERT INTO odontograms (medical_record_id, tooth_number, condition_type, notes)
       VALUES (?, ?, ?, ?)`,
      [
        medicalRecordId,
        o.tooth_number,
        o.condition_type,
        o.notes ? sanitizeString(o.notes, 500) : null,
      ]
    );
  }
}

/** Upsert single tooth (interactive odontogram) */
export const upsertTooth = asyncHandler(async (req, res) => {
  const mrId = Number(req.params.id);
  const { tooth_number, condition_type, notes } = req.body;

  const mr = await query('SELECT id FROM medical_records WHERE id = ?', [mrId]);
  if (!mr.length) throw new AppError('Rekam medis tidak ditemukan', 404);

  await execute(
    `INSERT INTO odontograms (medical_record_id, tooth_number, condition_type, notes)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE condition_type = VALUES(condition_type), notes = VALUES(notes)`,
    [
      mrId,
      tooth_number,
      condition_type,
      notes ? sanitizeString(notes, 500) : null,
    ]
  );

  const rows = await query(
    `SELECT id, medical_record_id, tooth_number, condition_type AS conditionType, notes, created_at
     FROM odontograms WHERE medical_record_id = ? AND tooth_number = ?`,
    [mrId, tooth_number]
  );

  res.json({ success: true, data: rows[0] });
});

async function replacePrescriptions(conn, medicalRecordId, items) {
  await conn.execute('DELETE FROM prescriptions WHERE medical_record_id = ?', [
    medicalRecordId,
  ]);
  for (const rx of items) {
    await conn.execute(
      `INSERT INTO prescriptions (medical_record_id, medicine_name, dosage, instruction)
       VALUES (?, ?, ?, ?)`,
      [
        medicalRecordId,
        sanitizeString(rx.medicine_name, 255),
        rx.dosage ? sanitizeString(rx.dosage, 255) : null,
        rx.instruction ? sanitizeString(rx.instruction, 1000) : null,
      ]
    );
  }
}

export const createMedicalRecord = asyncHandler(async (req, res) => {
  const {
    patient_id,
    doctor_id,
    complaint,
    diagnosis,
    treatment,
    notes,
    visit_date,
    odontograms = [],
    prescriptions = [],
  } = req.body;
  const recordDoctorId = await enforceDoctorOwnRecord(req, doctor_id);

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.execute(
      `INSERT INTO medical_records (patient_id, doctor_id, complaint, diagnosis, treatment, notes, visit_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id,
        recordDoctorId,
        complaint ? sanitizeString(complaint, 5000) : null,
        diagnosis ? sanitizeString(diagnosis, 5000) : null,
        treatment ? sanitizeString(treatment, 5000) : null,
        notes ? sanitizeString(notes, 5000) : null,
        visit_date,
      ]
    );

    const mrId = ins.insertId;

    if (odontograms.length) await replaceOdontograms(conn, mrId, odontograms);
    if (prescriptions.length)
      await replacePrescriptions(conn, mrId, prescriptions);

    await conn.commit();

    const rows = await query(
      `SELECT mr.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
            p.name AS patient_name, p.patient_code,
            p.birth_date AS patient_birth_date, p.gender AS patient_gender, p.phone AS patient_phone,
            p.address AS patient_address, p.nik AS patient_nik,
            d.name AS doctor_name, d.photo AS doctor_photo
       FROM medical_records mr
       JOIN patients p ON p.id = mr.patient_id
       JOIN doctors d ON d.id = mr.doctor_id
       WHERE mr.id = ?`,
      [mrId]
    );
    const mr = rows[0];
    mr.odontograms = await loadOdontograms(mrId);
    mr.prescriptions = await loadPrescriptions(mrId);

    res.status(201).json({ success: true, data: mr });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export const updateMedicalRecord = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const {
    patient_id,
    doctor_id,
    complaint,
    diagnosis,
    treatment,
    notes,
    visit_date,
    odontograms,
    prescriptions,
  } = req.body;
  const recordDoctorId = await enforceDoctorOwnRecord(req, doctor_id);

  const existing = await query('SELECT id FROM medical_records WHERE id = ?', [
    id,
  ]);
  if (!existing.length) throw new AppError('Rekam medis tidak ditemukan', 404);

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE medical_records SET patient_id = ?, doctor_id = ?, complaint = ?, diagnosis = ?, treatment = ?, notes = ?, visit_date = ?
       WHERE id = ?`,
      [
        patient_id,
        recordDoctorId,
        complaint ? sanitizeString(complaint, 5000) : null,
        diagnosis ? sanitizeString(diagnosis, 5000) : null,
        treatment ? sanitizeString(treatment, 5000) : null,
        notes ? sanitizeString(notes, 5000) : null,
        visit_date,
        id,
      ]
    );

    if (Array.isArray(odontograms))
      await replaceOdontograms(conn, id, odontograms);
    if (Array.isArray(prescriptions))
      await replacePrescriptions(conn, id, prescriptions);

    await conn.commit();

    const rows = await query(
      `SELECT mr.*, DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
            p.name AS patient_name, p.patient_code,
            p.birth_date AS patient_birth_date, p.gender AS patient_gender, p.phone AS patient_phone,
            p.address AS patient_address, p.nik AS patient_nik,
            d.name AS doctor_name, d.photo AS doctor_photo
       FROM medical_records mr
       JOIN patients p ON p.id = mr.patient_id
       JOIN doctors d ON d.id = mr.doctor_id
       WHERE mr.id = ?`,
      [id]
    );
    const mr = rows[0];
    mr.odontograms = await loadOdontograms(id);
    mr.prescriptions = await loadPrescriptions(id);

    res.json({ success: true, data: mr });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export const deleteMedicalRecord = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const r = await execute('DELETE FROM medical_records WHERE id = ?', [id]);
  if (!r.affectedRows) throw new AppError('Rekam medis tidak ditemukan', 404);
  res.json({ success: true, message: 'Rekam medis dihapus' });
});
