import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query, execute, getPool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';
import { sendPasswordResetCode, smtpConfigured } from '../utils/mailer.js';

/** Untuk role doctor: sertakan profil dokter (nama tampilan RME + foto) bila terhubung di tabel doctors. */
async function attachDoctorProfile(user) {
  const base = {
    ...user,
    doctor_id: null,
    doctor_name: null,
    doctor_photo: null,
  };
  if (!user || user.role !== 'doctor') return base;

  const rows = await query(
    `SELECT id, name, specialist, sip_number, phone AS profile_phone, photo, face_registered_at
     FROM doctors WHERE user_id = ? LIMIT 1`,
    [user.id]
  );
  if (!rows.length) return base;

  const d = rows[0];
  return {
    ...user,
    doctor_id: d.id,
    doctor_name: d.name,
    doctor_specialist: d.specialist,
    doctor_sip_number: d.sip_number,
    doctor_phone: d.profile_phone,
    doctor_photo: d.photo,
    doctor_face_registered_at: d.face_registered_at,
  };
}

function signToken(user, remember) {
  const expiresIn =
    remember === true
      ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d'
      : process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;

  const rows = await query(
    `SELECT id, name, email, password, role, phone, motto,
            COALESCE(is_active, 1) AS is_active
     FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Email atau password salah', 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    throw new AppError('Role akun tidak diizinkan login', 403);
  }

  const active = Number(user.is_active) === 1;
  if (!active) {
    throw new AppError('Akun dinonaktifkan. Hubungi administrator.', 403);
  }

  const token = signToken(user, remember === true);

  delete user.password;
  const enriched = await attachDoctorProfile(user);

  res.json({
    success: true,
    data: {
      token,
      user: enriched,
      expiresIn: remember === true ? '30d' : process.env.JWT_EXPIRES_IN || '7d',
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const emailNorm = req.body.email.toLowerCase().trim();
  const rows = await query(
    `SELECT id, email, COALESCE(is_active, 1) AS is_active
     FROM users WHERE email = ? LIMIT 1`,
    [emailNorm]
  );

  const user = rows[0];
  let emailSent = false;

  if (user && Number(user.is_active) === 1) {
    const code = String(crypto.randomInt(100000, 1000000));
    const tokenHash = hashResetToken(`${emailNorm}:${code}`);

    await execute(
      `UPDATE users
       SET reset_password_token_hash = ?,
           reset_password_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
       WHERE id = ?`,
      [tokenHash, user.id]
    );

    if (smtpConfigured()) {
      await sendPasswordResetCode({ to: emailNorm, code });
      emailSent = true;
    } else {
      throw new AppError(
        'Layanan email belum dikonfigurasi. Hubungi administrator.',
        503
      );
    }
  }

  res.json({
    success: true,
    message:
      'Jika email terdaftar dan aktif, kode reset password sudah dikirim.',
    data: {
      emailSent,
    },
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  const emailNorm = email.toLowerCase().trim();
  const tokenHash = hashResetToken(`${emailNorm}:${code}`);

  const rows = await query(
    `SELECT id FROM users
     WHERE email = ?
       AND reset_password_token_hash = ?
       AND reset_password_expires_at IS NOT NULL
       AND reset_password_expires_at > NOW()
     LIMIT 1`,
    [emailNorm, tokenHash]
  );

  const user = rows[0];
  if (!user) {
    throw new AppError('Kode reset password tidak valid atau sudah kadaluarsa', 400);
  }

  const hash = await bcrypt.hash(password, 10);
  await execute(
    `UPDATE users
     SET password = ?,
         reset_password_token_hash = NULL,
         reset_password_expires_at = NULL
     WHERE id = ?`,
    [hash, user.id]
  );

  res.json({
    success: true,
    message: 'Password berhasil diganti. Silakan login dengan password baru.',
  });
});

export const me = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, name, email, role, phone, motto, face_registered_at,
            COALESCE(is_active, 1) AS is_active,
            created_at
     FROM users WHERE id = ? LIMIT 1`,
    [req.user.id]
  );
  const user = rows[0];
  if (!user) throw new AppError('User tidak ditemukan', 404);
  const enriched = await attachDoctorProfile(user);
  res.json({ success: true, data: enriched });
});

export const patchMe = asyncHandler(async (req, res) => {
  const { name, email, phone, specialist, sip_number, motto } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  const emailNorm = email.toLowerCase().trim();
  const dup = await query('SELECT id FROM users WHERE email = ? AND id <> ?', [
    emailNorm,
    userId,
  ]);
  if (dup.length) {
    throw new AppError('Email sudah dipakai akun lain', 409);
  }

  const nameNorm = sanitizeString(name, 255);
  const phoneVal =
    phone === null || phone === undefined || phone === ''
      ? null
      : sanitizeString(String(phone).trim(), 50);

  const mottoVal =
    motto === undefined || motto === null || motto === ''
      ? null
      : sanitizeString(String(motto).trim(), 500);

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE users SET name = ?, email = ?, phone = ?, motto = ? WHERE id = ?`,
      [nameNorm, emailNorm, phoneVal, mottoVal, userId]
    );

    if (role === 'doctor') {
      const specVal =
        specialist !== undefined && specialist !== null && specialist !== ''
          ? sanitizeString(String(specialist).trim(), 255)
          : null;
      const sipVal =
        sip_number !== undefined && sip_number !== null && sip_number !== ''
          ? sanitizeString(String(sip_number).trim(), 100)
          : null;

      const [drRows] = await conn.execute(
        'SELECT id, photo FROM doctors WHERE user_id = ? LIMIT 1',
        [userId]
      );

      const photoPath = req.file ? `/uploads/doctors/${req.file.filename}` : null;

      if (drRows.length) {
        const currentPhoto = drRows[0].photo;
        const nextPhoto = photoPath ?? currentPhoto;
        await conn.execute(
          `UPDATE doctors SET name = ?, specialist = ?, sip_number = ?, phone = ?, photo = ?
           WHERE user_id = ?`,
          [nameNorm, specVal, sipVal, phoneVal, nextPhoto, userId]
        );
      } else {
        await conn.execute(
          `INSERT INTO doctors (user_id, name, specialist, sip_number, phone, photo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, nameNorm, specVal, sipVal, phoneVal, photoPath]
        );
      }
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const rows = await query(
    `SELECT id, name, email, role, phone, motto, face_registered_at,
            COALESCE(is_active, 1) AS is_active,
            created_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  const userRow = rows[0];
  const enriched = await attachDoctorProfile(userRow);

  const emailChanged = emailNorm !== (req.user.email || '').toLowerCase();
  let token;
  if (emailChanged) {
    token = signToken(
      { id: userId, role: req.user.role, email: emailNorm },
      false
    );
  }

  res.json({
    success: true,
    data: enriched,
    ...(token && { token }),
  });
});

export const changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, password } = req.body;

  const rows = await query(
    `SELECT id, password, COALESCE(is_active, 1) AS is_active
     FROM users WHERE id = ? LIMIT 1`,
    [req.user.id]
  );
  const user = rows[0];
  if (!user) throw new AppError('User tidak ditemukan', 404);
  if (Number(user.is_active) !== 1) {
    throw new AppError('Akun dinonaktifkan. Hubungi administrator.', 403);
  }
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Password lama tidak sesuai', 400);
  }

  const hash = await bcrypt.hash(password, 10);
  await execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

  res.json({
    success: true,
    message: 'Password berhasil diganti',
  });
});

function normalizeDescriptor(input) {
  const arr = Array.isArray(input) ? input : null;
  if (!arr || arr.length < 32 || arr.length > 1024) {
    throw new AppError('Descriptor wajah tidak valid', 422);
  }
  const nums = arr.map((n) => Number(n));
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new AppError('Descriptor wajah tidak valid', 422);
  }
  const norm = Math.sqrt(nums.reduce((sum, n) => sum + n * n, 0));
  if (!norm) throw new AppError('Descriptor wajah kosong', 422);
  return nums.map((n) => Number((n / norm).toFixed(6)));
}

export const registerMyFace = asyncHandler(async (req, res) => {
  const descriptor = normalizeDescriptor(req.body.descriptor);
  if (req.user.role === 'nurse') {
    await execute(
      `UPDATE users
       SET face_descriptor = ?,
           face_registered_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(descriptor), req.user.id]
    );

    const rows = await query(
      `SELECT id, name, email, role, phone, motto, face_registered_at,
              COALESCE(is_active, 1) AS is_active,
              created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Registrasi wajah berhasil',
      data: rows[0],
    });
  }

  if (req.user.role !== 'doctor') {
    throw new AppError('Registrasi wajah hanya untuk dokter dan perawat', 403);
  }

  const doctorRows = await query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [req.user.id]);
  if (!doctorRows.length) {
    throw new AppError('Akun belum terhubung ke data dokter', 403);
  }

  await execute(
    `UPDATE doctors
     SET face_descriptor = ?,
         face_registered_at = NOW()
     WHERE id = ?`,
    [JSON.stringify(descriptor), doctorRows[0].id]
  );

  const rows = await query(
    `SELECT id, name, email, role, phone, motto, face_registered_at,
            COALESCE(is_active, 1) AS is_active,
            created_at
     FROM users WHERE id = ? LIMIT 1`,
    [req.user.id]
  );
  const enriched = await attachDoctorProfile(rows[0]);
  res.json({
    success: true,
    message: 'Registrasi wajah berhasil',
    data: enriched,
  });
});
