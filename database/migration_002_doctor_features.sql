-- Jalankan sekali pada database yang sudah ada (setelah schema awal):
-- mysql -u root -p rme_klinik_gigi < database/migration_002_doctor_features.sql

USE rme_klinik_gigi;

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

CREATE TABLE IF NOT EXISTS doctor_attendance (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  status ENUM('hadir', 'izin', 'sakit', 'cuti', 'alfa') NOT NULL DEFAULT 'hadir',
  check_in TIME NULL,
  check_out TIME NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att_doctor_day (doctor_id, work_date),
  CONSTRAINT fk_att_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_att_month (doctor_id, work_date)
) ENGINE=InnoDB;

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
