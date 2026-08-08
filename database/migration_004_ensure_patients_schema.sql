-- Ensure patients table has all columns required by the current API.
-- Safe to run on existing installations.

CREATE TABLE IF NOT EXISTS patients (
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
) ENGINE=InnoDB;

SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN patient_code VARCHAR(50) NULL AFTER id', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'patient_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN nik VARCHAR(32) NULL AFTER patient_code', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'nik'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN gender ENUM(''L'', ''P'') NOT NULL DEFAULT ''L'' AFTER name', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'gender'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN birth_date DATE NULL AFTER gender', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'birth_date'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN phone VARCHAR(50) NULL AFTER birth_date', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'phone'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN address TEXT NULL AFTER phone', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'address'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN blood_type VARCHAR(8) NULL AFTER address', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'blood_type'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER blood_type', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'created_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at', 'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'updated_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE patients
SET patient_code = CONCAT('PAT-LEGACY-', LPAD(id, 6, '0'))
WHERE patient_code IS NULL OR patient_code = '';

SET @sql = (
  SELECT IF(COUNT(*) = 0, 'ALTER TABLE patients ADD UNIQUE KEY idx_patients_code (patient_code)', 'SELECT 1')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'patient_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
