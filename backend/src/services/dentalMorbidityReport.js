export const AGE_BANDS = [
  { key: 'age_0_4', label: '0-4 th', min: 0, max: 4 },
  { key: 'age_5_6', label: '5-6 th', min: 5, max: 6 },
  { key: 'age_7_11', label: '7-11 th', min: 7, max: 11 },
  { key: 'age_12', label: '12 th', min: 12, max: 12 },
  { key: 'age_13_14', label: '13-14 th', min: 13, max: 14 },
  { key: 'age_15_18', label: '15-18 th', min: 15, max: 18 },
  { key: 'age_19_34', label: '19-34 th', min: 19, max: 34 },
  { key: 'age_35_44', label: '35-44 th', min: 35, max: 44 },
  { key: 'age_45_64', label: '45-64 th', min: 45, max: 64 },
  { key: 'age_over_64', label: '>64 th', min: 65, max: Number.POSITIVE_INFINITY },
];

export const DISEASE_DEFINITIONS = [
  { id: 'k00_6', no: 1, name: 'Persistensi gigi sulung', icd: 'K00.6', matches: (code) => code === 'K00.6' },
  { id: 'k01_1', no: 2, name: 'Impaksi M3 klasifikasi IA', icd: 'K01.1', matches: (code) => code === 'K01.1' },
  { id: 'k02', no: 3, name: 'Karies gigi', icd: 'K02', matches: (code) => code.startsWith('K02') },
  { id: 'k03', no: 4, name: 'Penyakit jaringan keras gigi lainnya', icd: 'K03', matches: (code) => code.startsWith('K03') },
  { id: 'k04', no: 5, name: 'Penyakit pulpa dan jaringan periapikal', icd: 'K04', matches: (code) => code.startsWith('K04') },
  { id: 'k05', no: 6, name: 'Gingivitis dan penyakit periodental', icd: 'K05', matches: (code) => code.startsWith('K05') },
  { id: 'k07', no: 7, name: 'Anomali dentofasial', icd: 'K07', matches: (code) => code.startsWith('K07') },
  { id: 'k08', no: 8, name: 'Gangguan gigi dan jaringan penyangga lainnya', icd: 'K08', matches: (code) => code.startsWith('K08') },
  { id: 'k12', no: 9, name: 'Stomatitis dan lesi-lesi berhubungan', icd: 'K12', matches: (code) => code.startsWith('K12') },
  { id: 'k13_0', no: 10, name: 'Angular Cheilitis', icd: 'K13.0', matches: (code) => code === 'K13.0' },
  { id: 'l51', no: 11, name: 'Eritema Multiformis', icd: 'L51', matches: (code) => code.startsWith('L51') },
  { id: 'r51', no: 12, name: 'Nyeri orfasial', icd: 'R.51', matches: (code) => code.startsWith('R51') },
  { id: 's02_5', no: 13, name: 'Fraktur mahkota yang tidak merusak pulpa', icd: 'S02.5', matches: (code) => code === 'S02.5' },
];

const ACTIVITY_DEFINITIONS = [
  { type: 'section', no: 'I', label: 'KUNJUNGAN' },
  { type: 'data', id: 'new_visit', no: '1', label: 'Jumlah Kunjungan Baru' },
  { type: 'data', id: 'old_visit', no: '2', label: 'Jumlah Kunjungan Lama' },
  { type: 'data', id: 'general_visit', no: '3', label: 'Jumlah Kunjungan Umum' },
  { type: 'data', id: 'jkn_visit', no: '4', label: 'Jumlah Kunjungan JKN' },
  { type: 'section', no: 'II', label: 'JENIS TINDAKAN' },
  { type: 'data', id: 'consultation', no: '1', label: 'Konsultasi dan pemeriksaan' },
  { type: 'data', id: 'temporary_filling', no: '2', label: 'Penambalan sementara gigi sulung/permanen' },
  { type: 'data', id: 'permanent_filling', no: '3', label: 'Penambalan tetap gigi sulung/permanen' },
  { type: 'data', id: 'pulp_treatment', no: '4', label: 'Pengobatan dan perawatan pulpa' },
  { type: 'data', id: 'abscess_treatment', no: '5', label: 'Pengobatan dan perawatan abses' },
  { type: 'data', id: 'periodontal_treatment', no: '6', label: 'Pengobatan periodontal' },
  { type: 'data', id: 'scaling', no: '7', label: 'Scalling' },
  { type: 'data', id: 'primary_extraction', no: '8', label: 'Pencabutan gigi sulung' },
  { type: 'data', id: 'permanent_extraction', no: '9', label: 'Pencabutan gigi tetap' },
  { type: 'data', id: 'medication', no: '10', label: 'Pengobatan/premedikasi (resep)' },
  { type: 'label', no: '11', label: 'Prothesa Lepasan:' },
  { type: 'data', id: 'removable_complete', no: '', label: 'a. Lengkap', indent: true },
  { type: 'data', id: 'removable_partial', no: '', label: 'b. Sebagian', indent: true },
  { type: 'label', no: '12', label: 'Prothesa Cekat:' },
  { type: 'data', id: 'fixed_complete', no: '', label: 'a. Lengkap', indent: true },
  { type: 'data', id: 'fixed_partial', no: '', label: 'b. Sebagian', indent: true },
  { type: 'data', id: 'orthodontics', no: '13', label: 'Orthodonti' },
  { type: 'data', id: 'alveolectomy', no: '14', label: 'Alveolectomy' },
  { type: 'data', id: 'odontectomy', no: '15', label: 'Odontectomy' },
  { type: 'label', no: '16', label: 'Rujukan' },
  { type: 'data', id: 'adult_referral', no: '', label: 'a. Dewasa', indent: true },
  { type: 'data', id: 'child_referral', no: '', label: 'b. Anak-anak', indent: true },
];

function blankSexCount() {
  return { male: 0, female: 0, total: 0 };
}

function incrementSexCount(target, gender, amount = 1) {
  if (gender === 'L') target.male += amount;
  if (gender === 'P') target.female += amount;
  target.total = target.male + target.female;
}

function parseDateParts(value) {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function ageAtVisit(birthDate, visitDate) {
  const birth = parseDateParts(birthDate);
  const visit = parseDateParts(visitDate);
  if (!birth || !visit) return null;
  let age = visit.year - birth.year;
  if (visit.month < birth.month || (visit.month === birth.month && visit.day < birth.day)) age -= 1;
  return age >= 0 ? age : null;
}

function ageBandKey(age) {
  return AGE_BANDS.find((band) => age >= band.min && age <= band.max)?.key || null;
}

function secondaryDiagnosis(notes) {
  const line = String(notes || '')
    .split(/\r?\n/)
    .find((item) => /^Diagnosis Sekunder\s*:/i.test(item));
  return line ? line.replace(/^Diagnosis Sekunder\s*:/i, '').trim() : '';
}

function normalizeIcdCodes(text) {
  const codes = [];
  const pattern = /\b([A-Z])\.?\s*(\d{2})(?:\.(\d{1,2}))?\b/gi;
  let match;
  while ((match = pattern.exec(String(text || '').toUpperCase()))) {
    codes.push(`${match[1]}${match[2]}${match[3] ? `.${match[3]}` : ''}`);
  }
  return codes;
}

function diseaseIdsForRecord(record) {
  const diagnosisText = [record.diagnosis, secondaryDiagnosis(record.notes)].filter(Boolean).join('\n');
  const codes = normalizeIcdCodes(diagnosisText);
  const ids = new Set();
  for (const definition of DISEASE_DEFINITIONS) {
    if (codes.some((code) => definition.matches(code))) ids.add(definition.id);
  }

  const lower = diagnosisText.toLowerCase();
  if (/oral ulcer|stomatitis|sariawan|traumatic ulcer/.test(lower)) ids.add('k12');
  if (/angular cheilitis/.test(lower)) ids.add('k13_0');
  if (/nyeri oro?fasial/.test(lower)) ids.add('r51');
  return ids;
}

function parseTreatmentLines(treatment) {
  return String(treatment || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const frequency = Math.max(1, Number(line.match(/frekuensi\s*(\d+)/i)?.[1]) || 1);
      const name = line.replace(/\s*\([^)]*\),\s*frekuensi[\s\S]*$/i, '').trim() || line;
      return { name, frequency };
    });
}

function actionIdForName(name, age) {
  const text = String(name || '').toLowerCase();
  if (/odontect|odontekt/.test(text)) return 'odontectomy';
  if (/alveolect|alveolekt/.test(text)) return 'alveolectomy';
  if (/rujuk/.test(text)) return age != null && age < 18 ? 'child_referral' : 'adult_referral';
  if (/scal+ing|karang gigi|dental spa/.test(text)) return 'scaling';
  if (/orthodon|behel|breket|bracket|retainer|ganti kawat|debanding|penjepit gigitan/.test(text)) return 'orthodontics';
  if (/gigi tiruan lengkap/.test(text)) return 'removable_complete';
  if (/plat gigi tiruan|pergigi tiruan|gigi tiruan sebagian/.test(text)) return 'removable_partial';
  if (/full arch|protesa cekat lengkap/.test(text)) return 'fixed_complete';
  if (/crown|bridge|veneer|protesa cekat/.test(text)) return 'fixed_partial';
  if (/pencabutan|cabut|ekstraksi|\bexo\b/.test(text)) {
    return /sulung|anak|topikal/.test(text) ? 'primary_extraction' : 'permanent_extraction';
  }
  if (/tambal(?:an)? sementara|cavit|dressing/.test(text)) return 'temporary_filling';
  if (/tambal|restorasi|komposit|\bgic\b|\bbap\b/.test(text)) return 'permanent_filling';
  if (/pulpa|pulpotomi|saluran akar|\bpsa\b|obturasi|devite[ck]/.test(text)) return 'pulp_treatment';
  if (/abses|dry socket/.test(text)) return 'abscess_treatment';
  if (/periodontal|gingivectomy|operculectomy|splinting|occlusal adjustment|grinding/.test(text)) {
    return 'periodontal_treatment';
  }
  if (/premedikasi|pengobatan|resep/.test(text)) return 'medication';
  return null;
}

function createDiseaseRows() {
  return DISEASE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    no: definition.no,
    name: definition.name,
    icd: definition.icd,
    new_by_age: Object.fromEntries(AGE_BANDS.map((band) => [band.key, 0])),
    new_male: 0,
    new_female: 0,
    new_total: 0,
    old_male: 0,
    old_female: 0,
    old_total: 0,
  }));
}

function createActivityCounts() {
  return Object.fromEntries(
    ACTIVITY_DEFINITIONS.filter((row) => row.type === 'data').map((row) => [row.id, blankSexCount()])
  );
}

export function buildDentalMorbidityReport(records, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Bulan laporan harus berformat YYYY-MM');

  const diseases = createDiseaseRows();
  const diseaseById = new Map(diseases.map((row) => [row.id, row]));
  const activities = createActivityCounts();
  const seenDisease = new Set();
  const seenPatient = new Set();
  const orderedRecords = [...records].sort((a, b) => {
    const dateCompare = String(a.visit_date).localeCompare(String(b.visit_date));
    return dateCompare || Number(a.id || 0) - Number(b.id || 0);
  });

  for (const record of orderedRecords) {
    const visitDate = String(record.visit_date || '').slice(0, 10);
    const inSelectedMonth = visitDate.startsWith(month);
    const gender = record.gender === 'P' ? 'P' : record.gender === 'L' ? 'L' : '';
    const age = ageAtVisit(record.birth_date, visitDate);
    const patientKey = String(record.patient_id);
    const diseaseIds = diseaseIdsForRecord(record);

    for (const diseaseId of diseaseIds) {
      const historyKey = `${patientKey}:${diseaseId}`;
      const isNewCase = !seenDisease.has(historyKey);
      if (inSelectedMonth && gender) {
        const row = diseaseById.get(diseaseId);
        if (isNewCase) {
          const bandKey = ageBandKey(age);
          if (bandKey) row.new_by_age[bandKey] += 1;
          if (gender === 'L') row.new_male += 1;
          if (gender === 'P') row.new_female += 1;
          row.new_total = row.new_male + row.new_female;
        } else {
          if (gender === 'L') row.old_male += 1;
          if (gender === 'P') row.old_female += 1;
          row.old_total = row.old_male + row.old_female;
        }
      }
      seenDisease.add(historyKey);
    }

    if (inSelectedMonth && gender) {
      incrementSexCount(activities[seenPatient.has(patientKey) ? 'old_visit' : 'new_visit'], gender);
      incrementSexCount(activities.general_visit, gender);
      incrementSexCount(activities.consultation, gender);

      let medicationFromTreatment = 0;
      for (const item of parseTreatmentLines(record.treatment)) {
        const actionId = actionIdForName(item.name, age);
        if (!actionId) continue;
        if (actionId === 'medication') {
          medicationFromTreatment += item.frequency;
        } else {
          incrementSexCount(activities[actionId], gender, item.frequency);
        }
      }
      if (record.has_prescription || medicationFromTreatment > 0) {
        incrementSexCount(activities.medication, gender, record.has_prescription ? 1 : medicationFromTreatment);
      }
    }

    seenPatient.add(patientKey);
  }

  return {
    month,
    age_bands: AGE_BANDS.map(({ key, label }) => ({ key, label })),
    diseases,
    activities: ACTIVITY_DEFINITIONS.map((definition) => ({
      ...definition,
      ...(definition.type === 'data' ? activities[definition.id] : { male: 0, female: 0, total: 0 }),
    })),
    notes: [
      'Kasus baru adalah kemunculan pertama kelompok diagnosis yang sama pada pasien; kunjungan berikutnya dihitung sebagai kasus lama.',
      'Data penjamin belum tersedia. Seluruh kunjungan dihitung sebagai Kunjungan Umum dan Kunjungan JKN bernilai 0.',
      'Sumber: rekam medis rawat jalan gigi dan mulut pada bulan terpilih.',
      'Pengelompokan penyakit menggunakan kode ICD-10 pada diagnosis primer dan diagnosis sekunder yang tersimpan.',
    ],
  };
}
