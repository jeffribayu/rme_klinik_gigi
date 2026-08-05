-- Role baru: doctor, nurse (+ phone, is_active untuk soft delete)
-- mysql -u root -p rme_klinik_gigi < database/migration_004_users_roles_phone_active.sql

USE rme_klinik_gigi;

-- Tambah kolom jika belum ada (jalankan sekali)
ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER email;
ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role;

-- Expand ENUM sementara untuk migrasi nilai
ALTER TABLE users MODIFY COLUMN role ENUM('admin','dokter','resepsionis','doctor','nurse') NOT NULL DEFAULT 'nurse';

UPDATE users SET role = 'doctor' WHERE role = 'dokter';
UPDATE users SET role = 'nurse' WHERE role = 'resepsionis';

ALTER TABLE users MODIFY COLUMN role ENUM('admin','doctor','nurse') NOT NULL DEFAULT 'nurse';
