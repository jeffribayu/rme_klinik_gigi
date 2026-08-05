/** Nomor gigi valid FDI: tetap + susu (untuk validasi odontogram). */
const upperPermR = [18, 17, 16, 15, 14, 13, 12, 11];
const upperPermL = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerPermL = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerPermR = [48, 47, 46, 45, 44, 43, 42, 41];
const upperDecR = [55, 54, 53, 52, 51];
const upperDecL = [61, 62, 63, 64, 65];
const lowerDecL = [71, 72, 73, 74, 75];
const lowerDecR = [85, 84, 83, 82, 81];

export const VALID_FDI_TOOTH_NUMBERS = [
  ...upperPermR,
  ...upperPermL,
  ...upperDecR,
  ...upperDecL,
  ...lowerDecR,
  ...lowerDecL,
  ...lowerPermR,
  ...lowerPermL,
];

export const VALID_FDI_TOOTH_SET = new Set(VALID_FDI_TOOTH_NUMBERS);

export function isValidFdiToothNumber(n) {
  return Number.isInteger(n) && VALID_FDI_TOOTH_SET.has(n);
}
