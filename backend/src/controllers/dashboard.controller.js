import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const stats = asyncHandler(async (req, res) => {
  const patientsCount =
    (await query('SELECT COUNT(*) AS total FROM patients'))[0]?.total || 0;

  const appointmentsCount =
    (await query('SELECT COUNT(*) AS total FROM appointments'))[0]?.total || 0;

  const newPatientsCount =
    (
      await query(
        `SELECT COUNT(*) AS total
         FROM patients
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      )
    )[0]?.total || 0;

  const medicalRecordsCount =
    (await query('SELECT COUNT(*) AS total FROM medical_records'))[0]?.total || 0;

  const treatmentsCount =
    (
      await query(
        `SELECT COUNT(*) AS total
         FROM medical_records
         WHERE NULLIF(TRIM(treatment), '') IS NOT NULL`
      )
    )[0]?.total || 0;

  const payAgg = (
    await query(
      `SELECT COUNT(*) AS c, COALESCE(SUM(total_price), 0) AS revenue FROM payments WHERE payment_status = 'lunas'`
    )
  )[0];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStr = monthStart.toISOString().slice(0, 19).replace('T', ' ');

  const monthlyRow = (
    await query(
      `SELECT COALESCE(SUM(total_price), 0) AS s FROM payments
       WHERE payment_status = 'lunas' AND created_at >= ?`,
      [monthStr]
    )
  )[0];

  const visits = await query(`
    SELECT DATE_FORMAT(visit_date, '%Y-%m') AS period, COUNT(*) AS visits
    FROM medical_records
    WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(visit_date, '%Y-%m')
    ORDER BY period ASC
  `);

  const visitsByDay = await query(`
    SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS period, COUNT(*) AS visits
    FROM medical_records
    WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 24 DAY)
    GROUP BY DATE(visit_date)
    ORDER BY period ASC
  `);

  const newPatientsByDay = await query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period, COUNT(*) AS patients
    FROM patients
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 24 DAY)
    GROUP BY DATE(created_at)
    ORDER BY period ASC
  `);

  const treatmentsByDay = await query(`
    SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS period, COUNT(*) AS treatments
    FROM medical_records
    WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 24 DAY)
      AND NULLIF(TRIM(treatment), '') IS NOT NULL
    GROUP BY DATE(visit_date)
    ORDER BY period ASC
  `);

  const revenueByMonth = await query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS period, COALESCE(SUM(total_price), 0) AS amount
    FROM payments
    WHERE payment_status = 'lunas' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY period ASC
  `);

  const appointmentsByMonth = await query(`
    SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS period, COUNT(*) AS cnt
    FROM appointments
    WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(appointment_date, '%Y-%m')
    ORDER BY period ASC
  `);

  const appointmentByStatus = await query(`
    SELECT status, COUNT(*) AS cnt
    FROM appointments
    GROUP BY status
  `);

  const patientGender = await query(`
    SELECT gender AS label, COUNT(*) AS value
    FROM patients
    GROUP BY gender
  `);

  const patientAgeGroups = await query(`
    SELECT
      CASE
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 0 AND 10 THEN '0-10'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 11 AND 20 THEN '11-20'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 21 AND 30 THEN '21-30'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 31 AND 40 THEN '31-40'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 41 AND 50 THEN '41-50'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 51 AND 60 THEN '51-60'
        WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 61 AND 70 THEN '61-70'
        ELSE '71+'
      END AS label,
      COUNT(*) AS value
    FROM patients
    GROUP BY label
    ORDER BY MIN(TIMESTAMPDIFF(YEAR, birth_date, CURDATE()))
  `);

  res.json({
    success: true,
    data: {
      totalPatients: Number(patientsCount),
      totalNewPatients: Number(newPatientsCount),
      totalAppointments: Number(appointmentsCount),
      totalMedicalRecords: Number(medicalRecordsCount),
      totalTreatments: Number(treatmentsCount),
      totalPayments: Number(payAgg?.c || 0),
      totalRevenue: Number(payAgg?.revenue || 0),
      monthlyRevenue: Number(monthlyRow?.s || 0),
      visitsByMonth: visits,
      visitsByDay: visitsByDay.map((r) => ({
        period: r.period,
        visits: Number(r.visits),
      })),
      newPatientsByDay: newPatientsByDay.map((r) => ({
        period: r.period,
        patients: Number(r.patients),
      })),
      treatmentsByDay: treatmentsByDay.map((r) => ({
        period: r.period,
        treatments: Number(r.treatments),
      })),
      revenueByMonth,
      appointmentsByMonth: appointmentsByMonth.map((r) => ({
        period: r.period,
        appointments: Number(r.cnt),
      })),
      appointmentByStatus: appointmentByStatus.map((r) => ({
        status: r.status,
        count: Number(r.cnt),
      })),
      patientDemographics: {
        gender: patientGender.map((r) => ({
          label: r.label === 'L' ? 'Laki-laki' : 'Perempuan',
          value: Number(r.value),
        })),
        age: patientAgeGroups.map((r) => ({
          label: r.label,
          value: Number(r.value),
        })),
        occupation: [{ label: 'Tidak Diketahui', value: Number(patientsCount) }],
        district: [{ label: 'Tidak Diketahui', value: Number(patientsCount) }],
      },
    },
  });
});

export const todayAppointments = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT a.id, a.patient_id, a.doctor_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
            a.queue_number, a.status, a.created_at,
            p.name AS patient_name, p.patient_code, d.name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     WHERE DATE(a.appointment_date) = CURDATE()
     ORDER BY a.queue_number ASC`
  );
  res.json({ success: true, data: rows });
});

export const recentActivity = asyncHandler(async (req, res) => {
  const patients = await query(
    `SELECT 'pasien_baru' AS type, name AS title, created_at AS at
     FROM patients ORDER BY created_at DESC LIMIT 5`
  );
  const records = await query(
    `SELECT 'kunjungan' AS type,
            CONCAT(p.name, ' - ', COALESCE(LEFT(mr.diagnosis, 80), '-')) AS title,
            mr.created_at AS at
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     ORDER BY mr.created_at DESC LIMIT 5`
  );
  const pays = await query(
    `SELECT 'pembayaran' AS type,
            CONCAT(p.name, ' - Rp ', FORMAT(py.total_price, 0)) AS title,
            py.created_at AS at
     FROM payments py
     JOIN medical_records mr ON mr.id = py.medical_record_id
     JOIN patients p ON p.id = mr.patient_id
     ORDER BY py.created_at DESC LIMIT 5`
  );

  const merged = [...patients, ...records, ...pays]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 12);

  res.json({ success: true, data: merged });
});
