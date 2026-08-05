/** Strip HTML/script-ish chars from plain text fields */
export function sanitizeString(str, maxLen = 5000) {
  if (str === undefined || str === null) return str;
  const s = String(str).trim();
  return s.replace(/[<>]/g, '').slice(0, maxLen);
}
