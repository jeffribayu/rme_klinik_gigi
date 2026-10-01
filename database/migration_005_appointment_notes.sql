-- Tambahkan catatan pada jadwal pasien untuk instalasi yang sudah ada.
-- Aman dijalankan ulang karena kolom hanya ditambahkan bila belum tersedia.

SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE appointments ADD COLUMN notes TEXT NULL AFTER status',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'notes'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
