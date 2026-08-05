import '../loadEnv.js';
import { smtpConfigured } from '../utils/mailer.js';
import nodemailer from 'nodemailer';

function smtpPass() {
  return String(process.env.SMTP_PASS || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '');
}

const to = process.argv[2] || process.env.SMTP_USER;

if (!smtpConfigured()) {
  console.error('SMTP belum lengkap. Isi SMTP_HOST, SMTP_USER, dan SMTP_PASS di backend/.env');
  process.exit(1);
}

if (!to) {
  console.error('Usage: node src/scripts/test-smtp.js [email-tujuan]');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST?.trim(),
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: smtpPass(),
  },
});

try {
  await transporter.verify();
  console.log('SMTP verify OK');
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Tes SMTP RME Klinik Gigi',
    text: 'Jika Anda menerima email ini, konfigurasi SMTP sudah benar.',
  });
  console.log(`Email tes terkirim ke ${to}`);
} catch (e) {
  console.error('Gagal:', e.message);
  process.exit(1);
}
