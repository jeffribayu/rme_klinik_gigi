import assert from 'node:assert/strict';
import test from 'node:test';
import { receiptItemsFromRecord } from './thermalReceipt.js';

test('mengambil frekuensi tindakan dan jumlah obat untuk kuitansi', () => {
  const items = receiptItemsFromRecord(
    'Tambalan komposit kecil (26), frekuensi 2, petugas -, tarif Rp600.000',
    'Pemberian Obat:\nAmoxicillin, jumlah 6, tarif Rp2.000, subtotal Rp12.000',
    612000
  );

  assert.deepEqual(items, [
    { name: 'Tambalan komposit kecil', frequency: 2, amount: 600000 },
    { name: 'Amoxicillin', frequency: 6, amount: 12000 },
  ]);
});
