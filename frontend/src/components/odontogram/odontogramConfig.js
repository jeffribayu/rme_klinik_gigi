/** Susunan tampilan FDI — gigi tetap (permanen) */
export const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
export const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

/** Gigi susu (primer) FDI */
export const UPPER_DEC_RIGHT = [55, 54, 53, 52, 51];
export const UPPER_DEC_LEFT = [61, 62, 63, 64, 65];
export const LOWER_DEC_RIGHT = [85, 84, 83, 82, 81];
export const LOWER_DEC_LEFT = [71, 72, 73, 74, 75];

/** Empat baris seperti diagram klinik: atas tetap, atas susu, bawah susu, bawah tetap */
export const ODONTOGRAM_ROWS = [
  {
    key: 'upper_perm',
    shortLabel: 'Tetap atas',
    teeth: [...UPPER_RIGHT, ...UPPER_LEFT],
  },
  {
    key: 'upper_dec',
    shortLabel: 'Susu atas',
    teeth: [...UPPER_DEC_RIGHT, ...UPPER_DEC_LEFT],
  },
  {
    key: 'lower_dec',
    shortLabel: 'Susu bawah',
    teeth: [...LOWER_DEC_RIGHT, ...LOWER_DEC_LEFT],
  },
  {
    key: 'lower_perm',
    shortLabel: 'Tetap bawah',
    teeth: [...LOWER_RIGHT, ...LOWER_LEFT],
  },
];

export const ALL_CHART_TOOTH_NUMBERS = ODONTOGRAM_ROWS.flatMap((r) => r.teeth);

export const VALID_TOOTH_NUMBER_SET = new Set(ALL_CHART_TOOTH_NUMBERS);

export const CONDITION_LABELS = {
  sehat: 'Sehat',
  karies: 'Karies',
  tambalan: 'Tambalan',
  dicabut: 'Dicabut / tidak ada',
  implant: 'Implant',
  akar: 'Akar / sisa akar',
};

export const CONDITION_LABELS_SHORT = {
  sehat: 'Sehat',
  karies: 'Karies',
  tambalan: 'Tamb.',
  dicabut: 'Hilang',
  implant: 'Implant',
  akar: 'Akar',
};

export const CONDITION_COLORS = {
  sehat: '#22c55e',
  karies: '#ef4444',
  tambalan: '#3b82f6',
  dicabut: '#94a3b8',
  implant: '#a855f7',
  akar: '#f97316',
};
