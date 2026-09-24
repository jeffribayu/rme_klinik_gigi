import assert from 'node:assert/strict';
import test from 'node:test';
import { ageAtVisit, buildDentalMorbidityReport } from './dentalMorbidityReport.js';

test('menghitung umur pada tanggal kunjungan tanpa terpengaruh zona waktu', () => {
  assert.equal(ageAtVisit('2014-09-24', '2026-09-23'), 11);
  assert.equal(ageAtVisit('2014-09-23', '2026-09-23'), 12);
  assert.equal(ageAtVisit('1961-01-01', '2026-09-23'), 65);
});

test('mengelompokkan kasus baru/lama, umur, jenis kelamin, dan tindakan', () => {
  const records = [
    {
      id: 1,
      patient_id: 10,
      visit_date: '2026-08-10',
      birth_date: '1996-02-01',
      gender: 'L',
      diagnosis: 'K02.1 - Karies Dentin',
      treatment: '',
      notes: '',
      has_prescription: 0,
    },
    {
      id: 2,
      patient_id: 10,
      visit_date: '2026-09-05',
      birth_date: '1996-02-01',
      gender: 'L',
      diagnosis: 'K02.0 - Karies Enamel',
      treatment: 'Konservasi Gigi - Tambalan komposit kecil (26), frekuensi 2, petugas -, tarif Rp300.000',
      notes: '',
      has_prescription: 1,
    },
    {
      id: 3,
      patient_id: 11,
      visit_date: '2026-09-07',
      birth_date: '2020-10-01',
      gender: 'P',
      diagnosis: 'K00.6 - Persistensi Gigi Sulung',
      treatment: 'Perawatan Gigi Anak - Exo topikal tanpa penyulit (61), frekuensi 1, petugas -, tarif Rp150.000',
      notes: 'Diagnosis Sekunder: K05.0 - Gingivitis Akut',
      has_prescription: 0,
    },
  ];

  const report = buildDentalMorbidityReport(records, '2026-09', [
    { name: 'Konservasi Gigi - Tambalan komposit kecil', icd_code: '' },
    { name: 'Perawatan Gigi Anak - Exo topikal tanpa penyulit', icd_code: '' },
  ]);
  const caries = report.diseases.find((row) => row.id === 'k02');
  const persistence = report.diseases.find((row) => row.id === 'k00_6');
  const gingivitis = report.diseases.find((row) => row.id === 'k05');
  const activity = Object.fromEntries(report.activities.filter((row) => row.id).map((row) => [row.id, row]));

  assert.equal(caries.old_male, 1);
  assert.equal(caries.new_total, 0);
  assert.equal(persistence.new_female, 1);
  assert.equal(persistence.new_by_age.age_5_6, 1);
  assert.equal(persistence.new_by_age_sex.age_5_6.female, 1);
  assert.equal(
    Object.values(persistence.new_by_age).reduce((sum, value) => sum + value, 0),
    persistence.new_total
  );
  assert.equal(gingivitis.new_female, 1);
  assert.equal(activity.new_visit.female, 1);
  assert.equal(activity.old_visit.male, 1);
  assert.equal(activity.general_visit.total, 2);
  assert.equal(activity.permanent_filling.male, 2);
  assert.equal(activity.primary_extraction.female, 1);
  assert.equal(activity.medication.male, 1);
  assert.equal(activity.jkn_visit.total, 0);

  const filling = report.diseases.find(
    (row) => row.treatment_name === 'Konservasi Gigi - Tambalan komposit kecil'
  );
  const extraction = report.diseases.find(
    (row) => row.treatment_name === 'Perawatan Gigi Anak - Exo topikal tanpa penyulit'
  );
  assert.equal(filling.source, 'treatment');
  assert.equal(filling.new_by_age_sex.age_19_34.male, 2);
  assert.equal(filling.new_male, 2);
  assert.equal(extraction.new_by_age_sex.age_5_6.female, 1);
  assert.equal(extraction.new_total, 1);
});

test('menambahkan diagnosis di luar 13 kelompok baku ke laporan', () => {
  const report = buildDentalMorbidityReport(
    [
      {
        id: 1,
        patient_id: 12,
        visit_date: '2026-09-10',
        birth_date: '2000-01-01',
        gender: 'P',
        diagnosis: 'K14.0 - Glositis',
        treatment: '',
        notes: '',
        has_prescription: 0,
      },
    ],
    '2026-09'
  );

  const glossitis = report.diseases.find((row) => row.icd === 'K14.0');
  assert.equal(glossitis.name, 'Glositis');
  assert.equal(glossitis.new_by_age_sex.age_19_34.female, 1);
  assert.equal(glossitis.new_total, 1);
});
