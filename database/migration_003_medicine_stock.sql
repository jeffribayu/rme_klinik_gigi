-- Tambah kolom stok obat (jalankan jika tabel medicines sudah ada tanpa kolom ini):
-- mysql -u root -p rme_klinik_gigi < database/migration_003_medicine_stock.sql

USE rme_klinik_gigi;

ALTER TABLE medicines
  ADD COLUMN stock_qty INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jumlah unit stok'
  AFTER is_active;
