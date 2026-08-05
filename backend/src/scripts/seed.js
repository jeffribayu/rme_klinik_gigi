/**
 * Jalankan setelah schema.sql diterapkan:
 * mysql -u root -p < database/schema.sql
 * npm run seed
 */
import '../loadEnv.js';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { treatmentCatalog } from '../constants/treatmentCatalog.js';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rme_klinik_gigi',
    multipleStatements: true,
  });

  const hash = (p) => bcrypt.hashSync(p, 10);

  await conn.beginTransaction();

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.execute('TRUNCATE TABLE payments');
  await conn.execute('TRUNCATE TABLE odontograms');
  await conn.execute('TRUNCATE TABLE prescriptions');
  await conn.execute('TRUNCATE TABLE doctor_salaries');
  await conn.execute('TRUNCATE TABLE doctor_attendance');
  await conn.execute('TRUNCATE TABLE medicines');
  await conn.execute('TRUNCATE TABLE treatments');
  await conn.execute('TRUNCATE TABLE appointments');
  await conn.execute('TRUNCATE TABLE medical_records');
  await conn.execute('TRUNCATE TABLE patients');
  await conn.execute('TRUNCATE TABLE doctors');
  await conn.execute('TRUNCATE TABLE users');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

  await conn.execute(
    `INSERT INTO users (name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    ['Admin Utama', 'admin@klinik.test', hash('password123'), null, 'admin']
  );

  const [u2] = await conn.execute(
    `INSERT INTO users (name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    ['Dr. Andi Wijaya', 'dokter@klinik.test', hash('password123'), '081234567890', 'doctor']
  );
  const dokterUserId = u2.insertId;

  const [d1] = await conn.execute(
    `INSERT INTO doctors (user_id, name, specialist, sip_number, phone)
     VALUES (?, ?, ?, ?, ?)`,
    [
      dokterUserId,
      'Drg. Andi Wijaya',
      'Sp.KGA — Bedah Mulut',
      'SIP-123456/DKK',
      '081234567890',
    ]
  );
  const doctorId = d1.insertId;

  await conn.execute(
    `INSERT INTO doctors (user_id, name, specialist, sip_number, phone) VALUES (?, ?, ?, ?, ?)`,
    [
      null,
      'Drg. Maya Kartika',
      'Sp.Ortodonti',
      'SIP-654321/DKK',
      '081298765432',
    ]
  );

  await conn.execute(
    `INSERT INTO medicines (name, form, strength, notes, is_active, stock_qty) VALUES
     ('Amoxicillin', 'Kapsul', '500 mg', 'Antibiotik', 1, 200),
     ('Ibuprofen', 'Tablet', '400 mg', 'NSAID', 1, 150),
     ('Chlorhexidine gluconate', 'Obat kumur', '0.12%', 'Antiseptik mulut', 1, 80),
     ('Paracetamol', 'Tablet', '500 mg', 'Pereda nyeri ringan', 1, 300),
     ('Mefenamic acid', 'Kapsul', '500 mg', 'Pereda nyeri', 1, 100)`
  );

  for (const item of treatmentCatalog) {
    await conn.execute(
      `INSERT INTO treatments (name, icd_code, icd9_code, tooth_element, price, is_active)
       VALUES (?, NULL, ?, NULL, ?, 1)`,
      [item.name, item.icd9_code || null, item.price]
    );
  }

  await conn.execute(
    `INSERT INTO doctor_attendance (doctor_id, work_date, status, check_in, check_out, note)
     VALUES (?, CURDATE(), 'hadir', '08:00:00', '16:00:00', NULL)`,
    [doctorId]
  );
  await conn.execute(
    `INSERT INTO doctor_salaries (doctor_id, period_month, amount, notes)
     VALUES (?, '2026-05', 12500000, 'Contoh gaji pokok + tunjangan')`,
    [doctorId]
  );

  const patients = [
    [
      'PAT-20260510-0001',
      '3175010101010001',
      'Budi Santoso',
      'L',
      '1992-04-15',
      '0812111222333',
      'Jl. Melati No. 10, Jakarta',
      'O',
    ],
    [
      'PAT-20260510-0002',
      '3175020202020002',
      'Rina Melati',
      'P',
      '1988-11-22',
      '0813222333444',
      'Jl. Anggrek No. 5, Jakarta',
      'A',
    ],
    [
      'PAT-20260510-0003',
      null,
      'Fajar Nugraha',
      'L',
      '2015-07-08',
      '0814555666777',
      'Jl. Mawar No. 3, Bogor',
      'B',
    ],
  ];

  const patientIds = [];
  for (const p of patients) {
    const [ins] = await conn.execute(
      `INSERT INTO patients (patient_code, nik, name, gender, birth_date, phone, address, blood_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      p
    );
    patientIds.push(ins.insertId);
  }

  const [mr1] = await conn.execute(
    `INSERT INTO medical_records (patient_id, doctor_id, complaint, diagnosis, treatment, notes, visit_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patientIds[0],
      doctorId,
      'Nyeri gigi geraham kanan bawah sejak 3 hari',
      'Karies profunda gigi 46',
      'Tumpatan komposit gigi 46',
      'Kontrol 2 minggu',
      '2026-05-02',
    ]
  );
  const mrId1 = mr1.insertId;

  await conn.execute(
    `INSERT INTO odontograms (medical_record_id, tooth_number, condition_type, notes) VALUES
     (?, 16, 'tambalan', ?),
     (?, 46, 'karies', ?),
     (?, 36, 'sehat', ?)`,
    [
      mrId1,
      'Komposit tahun lalu',
      mrId1,
      'Kavitas mesial',
      mrId1,
      null,
    ]
  );

  await conn.execute(
    `INSERT INTO prescriptions (medical_record_id, medicine_name, dosage, instruction) VALUES
     (?, 'Amoxicillin', '500 mg', '3x1 sesudah makan, 5 hari'),
     (?, 'Ibuprofen', '400 mg', 'Sesuai nyeri, maks 3x/hari')`,
    [mrId1, mrId1]
  );

  const [mr2] = await conn.execute(
    `INSERT INTO medical_records (patient_id, doctor_id, complaint, diagnosis, treatment, notes, visit_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patientIds[1],
      doctorId,
      'Kontrol rutin scaling',
      'Gingivitis ringan',
      'Scaling radikal',
      null,
      '2026-05-08',
    ]
  );

  await conn.execute(
    `INSERT INTO payments (medical_record_id, total_price, payment_method, payment_status)
     VALUES (?, 850000, 'qris', 'lunas')`,
    [mrId1]
  );

  await conn.execute(
    `INSERT INTO payments (medical_record_id, total_price, payment_method, payment_status)
     VALUES (?, 450000, 'tunai', 'lunas')`,
    [mr2.insertId]
  );

  const today = new Date().toISOString().slice(0, 10);
  await conn.execute(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, queue_number, status) VALUES
       (?, ?, ?, 1, 'menunggu'),
       (?, ?, ?, 2, 'proses'),
       (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 1, 'menunggu')`,
    [
      patientIds[0],
      doctorId,
      `${today} 09:00:00`,
      patientIds[1],
      doctorId,
      `${today} 10:30:00`,
      patientIds[2],
      doctorId,
    ]
  );

  await conn.commit();
  console.log('Seed selesai.');
  console.log('Login: admin@klinik.test / password123');
  console.log('        dokter@klinik.test / password123');

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
