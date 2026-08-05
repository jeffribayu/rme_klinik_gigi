-- RME Klinik Gigi - MySQL Schema
-- Database: rme_klinik_gigi

CREATE DATABASE IF NOT EXISTS rme_klinik_gigi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rme_klinik_gigi;

-- ----------------------------
-- users
-- ----------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  reset_password_token_hash VARCHAR(128) NULL,
  reset_password_expires_at DATETIME NULL,
  phone VARCHAR(50) NULL,
  motto VARCHAR(500) NULL,
  role ENUM('admin', 'doctor', 'nurse') NOT NULL DEFAULT 'nurse',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

-- ----------------------------
-- doctors
-- ----------------------------
CREATE TABLE IF NOT EXISTS doctors (
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
) ENGINE=InnoDB;

-- ----------------------------
-- patients
-- ----------------------------
CREATE TABLE IF NOT EXISTS patients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_code VARCHAR(50) NOT NULL UNIQUE,
  nik VARCHAR(32) NULL,
  name VARCHAR(255) NOT NULL,
  gender ENUM('L', 'P') NOT NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  blood_type VARCHAR(8) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_code (patient_code),
  INDEX idx_patients_name (name),
  INDEX idx_patients_nik (nik)
) ENGINE=InnoDB;

-- ----------------------------
-- medical_records
-- ----------------------------
CREATE TABLE IF NOT EXISTS medical_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  doctor_id INT UNSIGNED NOT NULL,
  complaint TEXT NULL,
  diagnosis TEXT NULL,
  treatment TEXT NULL,
  notes TEXT NULL,
  visit_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mr_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_mr_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  INDEX idx_mr_patient (patient_id),
  INDEX idx_mr_doctor (doctor_id),
  INDEX idx_mr_visit (visit_date)
) ENGINE=InnoDB;

-- ----------------------------
-- odontograms
-- ----------------------------
CREATE TABLE IF NOT EXISTS odontograms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  medical_record_id INT UNSIGNED NOT NULL,
  tooth_number SMALLINT UNSIGNED NOT NULL,
  condition_type ENUM('sehat', 'karies', 'tambalan', 'dicabut', 'implant', 'akar') NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_odo_mr FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
  UNIQUE KEY uq_odo_tooth (medical_record_id, tooth_number),
  INDEX idx_odo_mr (medical_record_id)
) ENGINE=InnoDB;

-- ----------------------------
-- prescriptions
-- ----------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  medical_record_id INT UNSIGNED NOT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NULL,
  instruction TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rx_mr FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
  INDEX idx_rx_mr (medical_record_id)
) ENGINE=InnoDB;

-- ----------------------------
-- appointments
-- ----------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  doctor_id INT UNSIGNED NOT NULL,
  appointment_date DATETIME NOT NULL,
  queue_number INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('menunggu', 'proses', 'selesai', 'batal') NOT NULL DEFAULT 'menunggu',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  INDEX idx_appt_date (appointment_date),
  INDEX idx_appt_status (status)
) ENGINE=InnoDB;

-- ----------------------------
-- payments
-- ----------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  medical_record_id INT UNSIGNED NOT NULL,
  total_price DECIMAL(14, 2) NOT NULL DEFAULT 0,
  payment_method ENUM('tunai', 'kartu', 'transfer', 'qris', 'lainnya') NOT NULL DEFAULT 'tunai',
  payment_status ENUM('belum_bayar', 'lunas', 'sebagian') NOT NULL DEFAULT 'belum_bayar',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_mr FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
  INDEX idx_pay_status (payment_status),
  INDEX idx_pay_created (created_at)
) ENGINE=InnoDB;

-- ----------------------------
-- medicines (master obat untuk resep)
-- ----------------------------
CREATE TABLE IF NOT EXISTS medicines (
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
) ENGINE=InnoDB;

-- ----------------------------
-- treatments (master tindakan + tarif)
-- ----------------------------
CREATE TABLE IF NOT EXISTS treatments (
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
) ENGINE=InnoDB;

-- ----------------------------
-- doctor_attendance (absensi)
-- ----------------------------
CREATE TABLE IF NOT EXISTS doctor_attendance (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
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
  UNIQUE KEY uq_att_doctor_day (doctor_id, work_date),
  CONSTRAINT fk_att_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_att_month (doctor_id, work_date)
) ENGINE=InnoDB;

-- ----------------------------
-- doctor_salaries (gaji periode)
-- ----------------------------
CREATE TABLE IF NOT EXISTS doctor_salaries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  period_month CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sal_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_sal_doctor_month (doctor_id, period_month)
) ENGINE=InnoDB;
