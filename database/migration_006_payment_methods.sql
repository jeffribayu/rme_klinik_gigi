-- Metode pembayaran per bank dan metode baru dapat disimpan tanpa mengubah ENUM lagi.
ALTER TABLE payments
  MODIFY COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'tunai';
