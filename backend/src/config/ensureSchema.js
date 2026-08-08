import { execute, query } from './db.js';

/**
 * Menyamakan skema minimum untuk master obat agar instalasi lama
 * tidak perlu menjalankan SQL migrasi secara manual.
 */
async function ensureMedicinesSchema() {
  await execute(`CREATE TABLE IF NOT EXISTS medicines (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    form VARCHAR(100) NULL,
    strength VARCHAR(120) NULL,
    notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    stock_qty INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jumlah unit stok',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_med_active (is_active),
    INDEX idx_med_name (name)
  ) ENGINE=InnoDB`);

  const cols = await query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'medicines'
       AND COLUMN_NAME = 'stock_qty'`
  );
  const hasStock = Number(cols[0]?.cnt) > 0;
  if (!hasStock) {
    await execute(
      `ALTER TABLE medicines
        ADD COLUMN stock_qty INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jumlah unit stok'
        AFTER is_active`
    );
  }
}

async function ensureTreatmentsSchema() {
  await execute(`CREATE TABLE IF NOT EXISTS treatments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icd_code VARCHAR(50) NULL,
    icd9_code VARCHAR(50) NULL,
    tooth_element VARCHAR(100) NULL,
    price DECIMAL(14, 2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_treatment_active (is_active),
    INDEX idx_treatment_name (name)
  ) ENGINE=InnoDB`);
}

async function ensurePatientsSchema() {
  await execute(`CREATE TABLE IF NOT EXISTS patients (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(50) NULL,
    nik VARCHAR(32) NULL,
    name VARCHAR(255) NOT NULL,
    gender ENUM('L', 'P') NOT NULL DEFAULT 'L',
    birth_date DATE NULL,
    phone VARCHAR(50) NULL,
    address TEXT NULL,
    blood_type VARCHAR(8) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patients_name (name),
    INDEX idx_patients_nik (nik)
  ) ENGINE=InnoDB`);

  const cols = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has('patient_code')) {
    await execute(`ALTER TABLE patients ADD COLUMN patient_code VARCHAR(50) NULL AFTER id`);
  }
  if (!names.has('nik')) {
    await execute(`ALTER TABLE patients ADD COLUMN nik VARCHAR(32) NULL AFTER patient_code`);
  }
  if (!names.has('gender')) {
    await execute(`ALTER TABLE patients ADD COLUMN gender ENUM('L', 'P') NOT NULL DEFAULT 'L' AFTER name`);
  }
  if (!names.has('birth_date')) {
    await execute(`ALTER TABLE patients ADD COLUMN birth_date DATE NULL AFTER gender`);
  }
  if (!names.has('phone')) {
    await execute(`ALTER TABLE patients ADD COLUMN phone VARCHAR(50) NULL AFTER birth_date`);
  }
  if (!names.has('address')) {
    await execute(`ALTER TABLE patients ADD COLUMN address TEXT NULL AFTER phone`);
  }
  if (!names.has('blood_type')) {
    await execute(`ALTER TABLE patients ADD COLUMN blood_type VARCHAR(8) NULL AFTER address`);
  }
  if (!names.has('created_at')) {
    await execute(`ALTER TABLE patients ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER blood_type`);
  }
  if (!names.has('updated_at')) {
    await execute(`ALTER TABLE patients ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`);
  }

  await execute(`
    UPDATE patients
    SET patient_code = CONCAT('PAT-LEGACY-', LPAD(id, 6, '0'))
    WHERE patient_code IS NULL OR patient_code = ''
  `);

  const indexes = await query(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
     GROUP BY INDEX_NAME`
  );
  if (!indexes.some((idx) => idx.cols === 'patient_code')) {
    await execute(`ALTER TABLE patients ADD UNIQUE KEY idx_patients_code (patient_code)`);
  }
  if (!indexes.some((idx) => idx.INDEX_NAME === 'idx_patients_name')) {
    await execute(`ALTER TABLE patients ADD INDEX idx_patients_name (name)`);
  }
  if (!indexes.some((idx) => idx.INDEX_NAME === 'idx_patients_nik')) {
    await execute(`ALTER TABLE patients ADD INDEX idx_patients_nik (nik)`);
  }
}

/**
 * Master dokter harus ada sebelum tabel absensi/gaji (FK ke doctors.id).
 * Backfill: tiap user berperan dokter tanpa baris doctors → satu baris (nama/telepon dari users).
 */
async function ensureDoctorsTableAndBackfill() {
  await execute(`CREATE TABLE IF NOT EXISTS doctors (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    specialist VARCHAR(255) NULL,
    sip_number VARCHAR(100) NULL,
    phone VARCHAR(50) NULL,
    photo VARCHAR(500) NULL,
    face_descriptor JSON NULL,
    face_registered_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_doctors_user (user_id)
  ) ENGINE=InnoDB`);

  const cols = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctors'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has('face_descriptor')) {
    await execute(`ALTER TABLE doctors ADD COLUMN face_descriptor JSON NULL AFTER photo`);
  }
  if (!names.has('face_registered_at')) {
    await execute(`ALTER TABLE doctors ADD COLUMN face_registered_at DATETIME NULL AFTER face_descriptor`);
  }

  try {
    await execute(`
      INSERT INTO doctors (user_id, name, specialist, sip_number, phone, photo)
      SELECT u.id, u.name, NULL, NULL, u.phone, NULL
      FROM users u
      WHERE u.role = 'doctor'
        AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = u.id)
    `);
  } catch {
    /* Skema doctors lama/tidak sinkron — daftar & edit manual tetap bisa */
  }
}

/** Absensi + penggajian dokter (setara migration_002 bagian dokter). */
async function ensureDoctorPayrollTables() {
  await execute(`CREATE TABLE IF NOT EXISTS doctor_attendance (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    shift ENUM('shift1', 'shift2') NOT NULL DEFAULT 'shift1',
    status ENUM('hadir', 'izin', 'sakit', 'cuti', 'alfa') NOT NULL DEFAULT 'hadir',
    check_in TIME NULL,
    check_out TIME NULL,
    check_in_photo VARCHAR(500) NULL,
    check_out_photo VARCHAR(500) NULL,
    check_in_lat DECIMAL(10, 7) NULL,
    check_in_lng DECIMAL(10, 7) NULL,
    check_out_lat DECIMAL(10, 7) NULL,
    check_out_lng DECIMAL(10, 7) NULL,
    check_in_similarity DECIMAL(6, 4) NULL,
    check_out_similarity DECIMAL(6, 4) NULL,
    check_in_device VARCHAR(500) NULL,
    check_out_device VARCHAR(500) NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_att_doctor_day_shift (doctor_id, work_date, shift),
    CONSTRAINT fk_att_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_att_month (doctor_id, work_date)
  ) ENGINE=InnoDB`);

  const cols = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_attendance'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has('shift')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN shift ENUM('shift1', 'shift2') NOT NULL DEFAULT 'shift1' AFTER work_date`);
  }
  if (!names.has('check_in_photo')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_in_photo VARCHAR(500) NULL AFTER check_out`);
  }
  if (!names.has('check_out_photo')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_out_photo VARCHAR(500) NULL AFTER check_in_photo`);
  }
  if (!names.has('check_in_lat')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_in_lat DECIMAL(10, 7) NULL AFTER check_out_photo`);
  }
  if (!names.has('check_in_lng')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_in_lng DECIMAL(10, 7) NULL AFTER check_in_lat`);
  }
  if (!names.has('check_out_lat')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_out_lat DECIMAL(10, 7) NULL AFTER check_in_lng`);
  }
  if (!names.has('check_out_lng')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_out_lng DECIMAL(10, 7) NULL AFTER check_out_lat`);
  }
  if (!names.has('check_in_similarity')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_in_similarity DECIMAL(6, 4) NULL AFTER check_out_lng`);
  }
  if (!names.has('check_out_similarity')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_out_similarity DECIMAL(6, 4) NULL AFTER check_in_similarity`);
  }
  if (!names.has('check_in_device')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_in_device VARCHAR(500) NULL AFTER check_out_similarity`);
  }
  if (!names.has('check_out_device')) {
    await execute(`ALTER TABLE doctor_attendance ADD COLUMN check_out_device VARCHAR(500) NULL AFTER check_in_device`);
  }

  const indexes = await query(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_attendance' AND NON_UNIQUE = 0
     GROUP BY INDEX_NAME`
  );
  const hasDoctorDayShift = indexes.some((idx) => idx.cols === 'doctor_id,work_date,shift');
  const hasDoctorDayOnly = indexes.some(
    (idx) => idx.INDEX_NAME === 'uq_att_doctor_day' && idx.cols === 'doctor_id,work_date'
  );
  if (hasDoctorDayOnly) {
    try {
      await execute(`ALTER TABLE doctor_attendance DROP INDEX uq_att_doctor_day`);
    } catch {
      /* already dropped or renamed */
    }
  }
  if (!hasDoctorDayShift) {
    try {
      await execute(`ALTER TABLE doctor_attendance ADD UNIQUE KEY uq_att_doctor_day_shift (doctor_id, work_date, shift)`);
    } catch {
      /* existing installations may already have an equivalent key */
    }
  }

  await execute(`CREATE TABLE IF NOT EXISTS doctor_salaries (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    period_month CHAR(7) NOT NULL COMMENT 'YYYY-MM',
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sal_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_sal_doctor_month (doctor_id, period_month)
  ) ENGINE=InnoDB`);
}

/** Kolom phone / is_active + migrasi ENUM role legacy → doctor/nurse (best-effort). */
async function ensureUsersAuthColumns() {
  const cols = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has('phone')) {
    await execute(`ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER email`);
  }
  if (!names.has('is_active')) {
    await execute(
      `ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role`
    );
  }
  if (!names.has('motto')) {
    await execute(`ALTER TABLE users ADD COLUMN motto VARCHAR(500) NULL AFTER phone`);
  }
  if (!names.has('face_descriptor')) {
    await execute(`ALTER TABLE users ADD COLUMN face_descriptor JSON NULL AFTER motto`);
  }
  if (!names.has('face_registered_at')) {
    await execute(`ALTER TABLE users ADD COLUMN face_registered_at DATETIME NULL AFTER face_descriptor`);
  }
  if (!names.has('reset_password_token_hash')) {
    await execute(
      `ALTER TABLE users ADD COLUMN reset_password_token_hash VARCHAR(128) NULL AFTER password`
    );
  }
  if (!names.has('reset_password_expires_at')) {
    await execute(
      `ALTER TABLE users ADD COLUMN reset_password_expires_at DATETIME NULL AFTER reset_password_token_hash`
    );
  }

  const [roleCol] = await query(`SHOW COLUMNS FROM users LIKE 'role'`);
  const type = roleCol?.Type || '';
  if (type.includes('dokter') || type.includes('resepsionis')) {
    try {
      await execute(
        `ALTER TABLE users MODIFY COLUMN role ENUM('admin','dokter','resepsionis','doctor','nurse') NOT NULL DEFAULT 'nurse'`
      );
    } catch {
      /* sudah di tahap lain */
    }
    try {
      await execute(`UPDATE users SET role = 'doctor' WHERE role = 'dokter'`);
    } catch {
      /* */
    }
    try {
      await execute(`UPDATE users SET role = 'nurse' WHERE role = 'resepsionis'`);
    } catch {
      /* */
    }
    try {
      await execute(
        `ALTER TABLE users MODIFY COLUMN role ENUM('admin','doctor','nurse') NOT NULL DEFAULT 'nurse'`
      );
    } catch {
      /* */
    }
  }
}

async function ensureStaffAttendanceTable() {
  await execute(`CREATE TABLE IF NOT EXISTS staff_attendance (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    shift ENUM('shift1', 'shift2') NOT NULL DEFAULT 'shift1',
    status ENUM('hadir', 'izin', 'sakit', 'cuti', 'alfa') NOT NULL DEFAULT 'hadir',
    check_in TIME NULL,
    check_out TIME NULL,
    check_in_photo VARCHAR(500) NULL,
    check_out_photo VARCHAR(500) NULL,
    check_in_lat DECIMAL(10, 7) NULL,
    check_in_lng DECIMAL(10, 7) NULL,
    check_out_lat DECIMAL(10, 7) NULL,
    check_out_lng DECIMAL(10, 7) NULL,
    check_in_similarity DECIMAL(6, 4) NULL,
    check_out_similarity DECIMAL(6, 4) NULL,
    check_in_device VARCHAR(500) NULL,
    check_out_device VARCHAR(500) NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_staff_att_day_shift (user_id, work_date, shift),
    CONSTRAINT fk_staff_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff_att_month (user_id, work_date)
  ) ENGINE=InnoDB`);

  const cols = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has('shift')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN shift ENUM('shift1', 'shift2') NOT NULL DEFAULT 'shift1' AFTER work_date`);
  }
  if (!names.has('check_in_photo')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_in_photo VARCHAR(500) NULL AFTER check_out`);
  }
  if (!names.has('check_out_photo')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_out_photo VARCHAR(500) NULL AFTER check_in_photo`);
  }
  if (!names.has('check_in_lat')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_in_lat DECIMAL(10, 7) NULL AFTER check_out_photo`);
  }
  if (!names.has('check_in_lng')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_in_lng DECIMAL(10, 7) NULL AFTER check_in_lat`);
  }
  if (!names.has('check_out_lat')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_out_lat DECIMAL(10, 7) NULL AFTER check_in_lng`);
  }
  if (!names.has('check_out_lng')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_out_lng DECIMAL(10, 7) NULL AFTER check_out_lat`);
  }
  if (!names.has('check_in_similarity')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_in_similarity DECIMAL(6, 4) NULL AFTER check_out_lng`);
  }
  if (!names.has('check_out_similarity')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_out_similarity DECIMAL(6, 4) NULL AFTER check_in_similarity`);
  }
  if (!names.has('check_in_device')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_in_device VARCHAR(500) NULL AFTER check_out_similarity`);
  }
  if (!names.has('check_out_device')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN check_out_device VARCHAR(500) NULL AFTER check_in_device`);
  }
  if (!names.has('note')) {
    await execute(`ALTER TABLE staff_attendance ADD COLUMN note VARCHAR(500) NULL AFTER check_out_device`);
  }

  const indexes = await query(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND NON_UNIQUE = 0
     GROUP BY INDEX_NAME`
  );
  const hasStaffDayShift = indexes.some((idx) => idx.cols === 'user_id,work_date,shift');
  const hasStaffDayOnly = indexes.some(
    (idx) => idx.INDEX_NAME === 'uq_staff_att_day' && idx.cols === 'user_id,work_date'
  );
  if (hasStaffDayOnly) {
    try {
      await execute(`ALTER TABLE staff_attendance DROP INDEX uq_staff_att_day`);
    } catch {
      /* already dropped or renamed */
    }
  }
  if (!hasStaffDayShift) {
    try {
      await execute(`ALTER TABLE staff_attendance ADD UNIQUE KEY uq_staff_att_day_shift (user_id, work_date, shift)`);
    } catch {
      /* existing installations may already have an equivalent key */
    }
  }
}

export async function ensureAppSchema() {
  await ensureUsersAuthColumns();
  await ensurePatientsSchema();
  await ensureDoctorsTableAndBackfill();
  await ensureMedicinesSchema();
  await ensureTreatmentsSchema();
  await ensureDoctorPayrollTables();
  await ensureStaffAttendanceTable();
}
