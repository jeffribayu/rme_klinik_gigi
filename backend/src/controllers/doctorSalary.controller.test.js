import assert from 'node:assert/strict';
import test from 'node:test';
import { medicalServicePercentFor } from './doctorSalary.controller.js';

const prosthodonticTreatmentsAtThirtyPercent = [
  'Tindakan Prostodonti - Crown/bridge PFM',
  'Tindakan Prostodonti - Crown/bridge/veneer emax',
  'Tindakan Prostodonti - Crown/bridge/veneer zirconia',
  'Tindakan Prostodonti - Gigi tiruan lengkap akrilik RA dan RB',
  'Tindakan Prostodonti - Gigi tiruan lengkap akrilik RA/RB',
  'Tindakan Prostodonti - Gigi tiruan lengkap thermosen RA dan RB',
  'Tindakan Prostodonti - Gigi tiruan lengkap thermosen RA/RB',
  'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 1 bilateral',
  'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 1 unilateral',
  'Tindakan Prostodonti - Plat gigi tiruan bahan valpas bilateral',
  'Tindakan Prostodonti - Plat gigi tiruan bahan valpas unilateral',
  'Tindakan Prostodonti - Plat gigi tiruan bahan thermosen bilateral',
];

test('menggunakan jasa medis 30% untuk tindakan prostodonti yang ditentukan', () => {
  for (const treatment of prosthodonticTreatmentsAtThirtyPercent) {
    assert.equal(medicalServicePercentFor(treatment), 30, treatment);
  }
});

test('tetap mengenali tindakan 30% yang disertai elemen gigi', () => {
  assert.equal(
    medicalServicePercentFor('Tindakan Prostodonti - Crown/bridge PFM (11)'),
    30
  );
});

test('tindakan lain tetap menggunakan jasa medis 40%', () => {
  assert.equal(medicalServicePercentFor('Konservasi Gigi - Tambalan komposit kecil'), 40);
});
