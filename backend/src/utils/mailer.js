import nodemailer from 'nodemailer';
import '../loadEnv.js';

function smtpPass() {
  return String(process.env.SMTP_PASS || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '');
}

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      smtpPass()
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: smtpPass(),
    },
  });
}

export async function sendPasswordResetCode({ to, code }) {
  if (!smtpConfigured()) {
    return { sent: false, reason: 'SMTP belum dikonfigurasi' };
  }

  const appName = process.env.APP_NAME || 'RME Klinik Gigi';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();

  try {
    await transporter.verify();
  } catch (e) {
    console.error('[mailer] SMTP verify gagal:', e.message);
    throw new Error(
      'Koneksi SMTP gagal. Periksa SMTP_HOST, SMTP_USER, dan SMTP_PASS (App Password Gmail).'
    );
  }

  await transporter.sendMail({
    from,
    to,
    subject: `Kode reset password ${appName}`,
    text: [
      `Kode reset password Anda: ${code}`,
      '',
      'Kode ini berlaku selama 15 menit.',
      'Jika Anda tidak meminta reset password, abaikan email ini.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px;color:#0f766e">${appName}</h2>
        <p>Kode reset password Anda:</p>
        <div style="display:inline-block;margin:12px 0;padding:12px 18px;border-radius:12px;background:#ccfbf1;color:#134e4a;font-size:28px;font-weight:700;letter-spacing:6px">
          ${code}
        </div>
        <p>Kode ini berlaku selama <strong>15 menit</strong>.</p>
        <p style="font-size:12px;color:#64748b">Jika Anda tidak meminta reset password, abaikan email ini.</p>
      </div>
    `,
  });

  return { sent: true };
}
