export const PAYMENT_METHOD_OPTIONS = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer_bri', label: 'Transfer Bank BRI' },
  { value: 'transfer_mandiri', label: 'Transfer Bank Mandiri' },
  { value: 'transfer_bca', label: 'Transfer Bank BCA' },
  { value: 'transfer_bni', label: 'Transfer Bank BNI' },
  { value: 'transfer', label: 'Transfer Bank Lainnya' },
  { value: 'qris', label: 'QRIS' },
  { value: 'kartu', label: 'Kartu' },
  { value: 'lainnya', label: 'Lainnya' },
];

const paymentMethodLabels = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map(({ value, label }) => [value, label])
);

export function paymentMethodLabel(value) {
  return paymentMethodLabels[value] || String(value || '-').replaceAll('_', ' ');
}
