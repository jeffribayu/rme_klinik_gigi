import { timingSafeEqual } from 'crypto';
import { query, execute } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeString } from '../utils/sanitize.js';
import { getDoctorIdForUser } from '../middleware/auth.js';

const CLINIC_LOCATION = {
  lat: Number(process.env.ATTENDANCE_CLINIC_LAT || -1.6126875),
  lng: Number(process.env.ATTENDANCE_CLINIC_LNG || 102.3421406),
  radiusMeters: Number(process.env.ATTENDANCE_CLINIC_RADIUS_METERS || 50),
  calibrationMarginMeters: Number(process.env.ATTENDANCE_CLINIC_CALIBRATION_MARGIN_METERS || 15),
  maxAccuracyToleranceMeters: Number(
    process.env.ATTENDANCE_MAX_GPS_ACCURACY_TOLERANCE_METERS || 75
  ),
};
const SHIFTS = {
  shift1: { label: 'Shift 1', start: '09:00:00', graceLimit: '09:15:00' },
  shift2: { label: 'Shift 2', start: '15:00:00', graceLimit: '15:15:00' },
};
const DEFAULT_FACE_THRESHOLD = 0.55;
const SHIFT_GRACE_SQL = `CASE WHEN shift = 'shift2' THEN '${SHIFTS.shift2.graceLimit}' ELSE '${SHIFTS.shift1.graceLimit}' END`;
const LATE_MINUTES_SQL = `CEIL((TIME_TO_SEC(check_in) - TIME_TO_SEC(${SHIFT_GRACE_SQL})) / 60)`;
const LATE_NOTE_SQL = `
  CASE
    WHEN check_in IS NOT NULL AND check_in > ${SHIFT_GRACE_SQL}
    THEN CONCAT(
      'Terlambat ',
      CASE
        WHEN ${LATE_MINUTES_SQL} >= 60 AND MOD(${LATE_MINUTES_SQL}, 60) = 0
          THEN CONCAT(FLOOR(${LATE_MINUTES_SQL} / 60), ' jam')
        WHEN ${LATE_MINUTES_SQL} >= 60
          THEN CONCAT(FLOOR(${LATE_MINUTES_SQL} / 60), ' jam ', MOD(${LATE_MINUTES_SQL}, 60), ' menit')
        ELSE CONCAT(${LATE_MINUTES_SQL}, ' menit')
      END
    )
    ELSE NULL
  END AS late_note`;

function jakartaClockParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const o = {};
  for (const p of parts) {
    if (p.type !== 'literal') o[p.type] = p.value;
  }
  const pad = (v) => String(v).padStart(2, '0');
  return {
    date: `${o.year}-${pad(o.month)}-${pad(o.day)}`,
    time: `${pad(o.hour)}:${pad(o.minute)}:${pad(o.second)}`,
  };
}

function qrPayloadMatches(received, expected) {
  const a = Buffer.from(String(received).trim(), 'utf8');
  const b = Buffer.from(String(expected).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseDescriptor(raw) {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new AppError('Descriptor wajah tidak valid', 422);
    }
  }
  if (!Array.isArray(value) || value.length < 32 || value.length > 1024) {
    throw new AppError('Descriptor wajah tidak valid', 422);
  }
  const nums = value.map((n) => Number(n));
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new AppError('Descriptor wajah tidak valid', 422);
  }
  const norm = Math.sqrt(nums.reduce((sum, n) => sum + n * n, 0));
  if (!norm) throw new AppError('Descriptor wajah kosong', 422);
  return nums.map((n) => n / norm);
}

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function numberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function secondsFromTime(time) {
  const [hour = 0, minute = 0, second = 0] = String(time)
    .split(':')
    .map((part) => Number(part));
  if (![hour, minute, second].every(Number.isFinite)) return 0;
  return hour * 3600 + minute * 60 + second;
}

function normalizeShift(value) {
  return value === 'shift2' ? 'shift2' : 'shift1';
}

function shiftForTime(time) {
  return secondsFromTime(time) >= secondsFromTime(SHIFTS.shift2.start) ? 'shift2' : 'shift1';
}

function attendanceNoteForCheckIn(time, shift) {
  const graceLimit = SHIFTS[normalizeShift(shift)].graceLimit;
  const lateSeconds = secondsFromTime(time) - secondsFromTime(graceLimit);
  if (lateSeconds <= 0) return null;
  const lateMinutes = Math.ceil(lateSeconds / 60);
  const hours = Math.floor(lateMinutes / 60);
  const minutes = lateMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `Terlambat ${hours} jam ${minutes} menit`;
  }
  if (hours > 0) {
    return `Terlambat ${hours} jam`;
  }
  return `Terlambat ${minutes} menit`;
}

async function openAttendanceForShift(table, ownerColumn, ownerId, workDate) {
  const rows = await query(
    `SELECT * FROM ${table}
     WHERE ${ownerColumn} = ? AND work_date = ? AND check_in IS NOT NULL AND check_out IS NULL
     ORDER BY shift DESC, check_in DESC
     LIMIT 1`,
    [ownerId, workDate]
  );
  return rows[0] || null;
}

function distanceMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

function assertWithinClinicRadius(lat, lng, accuracy) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError('Lokasi GPS wajib dikirim untuk absensi wajah', 422);
  }
  const distance = distanceMeters({ lat, lng }, CLINIC_LOCATION);
  const accuracyTolerance = Number.isFinite(accuracy)
    ? Math.min(Math.max(accuracy, 0), CLINIC_LOCATION.maxAccuracyToleranceMeters)
    : 0;
  const effectiveDistance = Math.max(
    0,
    distance - accuracyTolerance - CLINIC_LOCATION.calibrationMarginMeters
  );
  if (effectiveDistance > CLINIC_LOCATION.radiusMeters) {
    throw new AppError(
      `Lokasi di luar radius absensi klinik. Jarak Anda ${Math.round(distance)} meter, maksimal ${CLINIC_LOCATION.radiusMeters} meter.`,
      403
    );
  }
  return { distance, accuracyTolerance, effectiveDistance };
}

function requestDevice(req) {
  return sanitizeString(req.headers['user-agent'] || 'Browser tidak diketahui', 500);
}

export const listAttendance = asyncHandler(async (req, res) => {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError('Parameter month wajib (format YYYY-MM)', 400);
  }

  if (req.user.role === 'doctor') {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      throw new AppError('Akun belum terhubung ke data dokter. Hubungi admin.', 403);
    }
    const rows = await query(
      `SELECT da.*, ${LATE_NOTE_SQL}, d.name AS doctor_name
       FROM doctor_attendance da
       JOIN doctors d ON d.id = da.doctor_id
       WHERE da.doctor_id = ? AND DATE_FORMAT(da.work_date, '%Y-%m') = ?
       ORDER BY da.work_date ASC, da.shift ASC`,
      [doctorId, month]
    );
    return res.json({ success: true, data: rows });
  }

  if (req.user.role === 'nurse') {
    const rows = await query(
      `SELECT sa.*, ${LATE_NOTE_SQL}, 'nurse' AS personnel_type, u.name AS personnel_name, u.name AS doctor_name
       FROM staff_attendance sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.user_id = ? AND DATE_FORMAT(sa.work_date, '%Y-%m') = ?
       ORDER BY sa.work_date ASC, sa.shift ASC`,
      [req.user.id, month]
    );
    return res.json({ success: true, data: rows });
  }

  if (req.user.role === 'admin') {
    const typeFilter = ['doctor', 'nurse'].includes(req.query.type) ? req.query.type : 'all';
    const doctorFilter = req.query.doctor_id ? Number(req.query.doctor_id) : null;
    const nurseFilter = req.query.nurse_id ? Number(req.query.nurse_id) : null;
    const parts = [];
    const params = [];

    if (typeFilter !== 'nurse') {
      let doctorSql = `SELECT da.*, ${LATE_NOTE_SQL}, 'doctor' AS personnel_type, d.name AS personnel_name, d.name AS doctor_name
       FROM doctor_attendance da
       JOIN doctors d ON d.id = da.doctor_id
       WHERE DATE_FORMAT(da.work_date, '%Y-%m') = ?`;
      params.push(month);
      if (doctorFilter) {
        doctorSql += ' AND da.doctor_id = ?';
        params.push(doctorFilter);
      }
      parts.push(doctorSql);
    }

    if (typeFilter !== 'doctor') {
      let nurseSql = `SELECT sa.*, ${LATE_NOTE_SQL}, 'nurse' AS personnel_type, u.name AS personnel_name, u.name AS doctor_name
       FROM staff_attendance sa
       JOIN users u ON u.id = sa.user_id
       WHERE u.role = 'nurse' AND DATE_FORMAT(sa.work_date, '%Y-%m') = ?`;
      params.push(month);
      if (nurseFilter) {
        nurseSql += ' AND sa.user_id = ?';
        params.push(nurseFilter);
      }
      parts.push(nurseSql);
    }

    const sql = `${parts.join(' UNION ALL ')}
       ORDER BY work_date ASC, shift ASC, personnel_type ASC, personnel_name ASC`;
    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  }

  throw new AppError('Akses ditolak', 403);
});

export const getAttendanceQrPayloads = asyncHandler(async (_req, res) => {
  const checkin = process.env.ATTENDANCE_QR_CHECKIN || 'RME_ABS_CHECKIN_DEV';
  const checkout = process.env.ATTENDANCE_QR_CHECKOUT || 'RME_ABS_CHECKOUT_DEV';
  res.json({
    success: true,
    data: {
      checkin,
      checkout,
      hint: 'Cetak dua QR ini dan tempel di klinik. Dokter memindai dengan menu Absensi.',
    },
  });
});

/** Absen masuk/pulang via pemindaian QR (isi harus sama dengan nilai di server / .env). */
export const scanAttendance = asyncHandler(async (req, res) => {
  const doctorId = await getDoctorIdForUser(req.user.id);
  if (!doctorId) {
    throw new AppError('Akun belum terhubung ke data dokter', 403);
  }

  const { mode, payload } = req.body;
  const expectedIn = process.env.ATTENDANCE_QR_CHECKIN || 'RME_ABS_CHECKIN_DEV';
  const expectedOut = process.env.ATTENDANCE_QR_CHECKOUT || 'RME_ABS_CHECKOUT_DEV';
  const ok =
    mode === 'in'
      ? qrPayloadMatches(payload, expectedIn)
      : qrPayloadMatches(payload, expectedOut);
  if (!ok) {
    throw new AppError('QR tidak valid atau bukan QR absensi klinik', 400);
  }

  const { date: workDate, time } = jakartaClockParts();
  const shift =
    mode === 'in'
      ? shiftForTime(time)
      : normalizeShift(
          (await openAttendanceForShift('doctor_attendance', 'doctor_id', doctorId, workDate))
            ?.shift || shiftForTime(time)
        );
  const checkInNote = mode === 'in' ? attendanceNoteForCheckIn(time, shift) : null;

  if (mode === 'in') {
    await execute(
      `INSERT INTO doctor_attendance (doctor_id, work_date, shift, status, check_in, check_out, note)
       VALUES (?, ?, ?, 'hadir', ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         status = 'hadir',
         check_in = VALUES(check_in),
         note = VALUES(note),
         check_out = doctor_attendance.check_out`,
      [doctorId, workDate, shift, time, checkInNote]
    );
  } else {
    await execute(
      `INSERT INTO doctor_attendance (doctor_id, work_date, shift, status, check_in, check_out, note)
       VALUES (?, ?, ?, 'hadir', NULL, ?, NULL)
       ON DUPLICATE KEY UPDATE
         check_out = VALUES(check_out),
         check_in = COALESCE(doctor_attendance.check_in, VALUES(check_in))`,
      [doctorId, workDate, shift, time]
    );
  }

  const rows = await query(
    `SELECT da.*, d.name AS doctor_name
     FROM doctor_attendance da
     JOIN doctors d ON d.id = da.doctor_id
     WHERE da.doctor_id = ? AND da.work_date = ? AND da.shift = ?`,
    [doctorId, workDate, shift]
  );
  const row = rows[0];
  if (!row) {
    throw new AppError('Gagal memuat data absensi setelah simpan', 500);
  }
  res.json({
    success: true,
    data: row,
    recorded_at: time,
    recorded_mode: mode,
    shift,
  });
});

export const selfieAttendance = asyncHandler(async (req, res) => {
  const doctorId = await getDoctorIdForUser(req.user.id);
  if (!doctorId) {
    throw new AppError('Akun belum terhubung ke data dokter', 403);
  }

  const mode = req.body.mode;
  if (mode !== 'in' && mode !== 'out') {
    throw new AppError('Mode absensi tidak valid', 400);
  }
  if (!req.file) {
    throw new AppError('Foto selfie wajib diunggah', 422);
  }

  const { date: workDate, time } = jakartaClockParts();
  const photoPath = `/uploads/attendance/${req.file.filename}`;
  const shift =
    mode === 'in'
      ? shiftForTime(time)
      : normalizeShift(
          (await openAttendanceForShift('doctor_attendance', 'doctor_id', doctorId, workDate))
            ?.shift || shiftForTime(time)
        );
  const checkInNote = mode === 'in' ? attendanceNoteForCheckIn(time, shift) : null;

  if (mode === 'in') {
    await execute(
      `INSERT INTO doctor_attendance (doctor_id, work_date, shift, status, check_in, check_out, check_in_photo, check_out_photo, note)
       VALUES (?, ?, ?, 'hadir', ?, NULL, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         status = 'hadir',
         check_in = VALUES(check_in),
         check_in_photo = VALUES(check_in_photo),
         note = VALUES(note),
         check_out = doctor_attendance.check_out,
         check_out_photo = doctor_attendance.check_out_photo`,
      [doctorId, workDate, shift, time, photoPath, checkInNote]
    );
  } else {
    await execute(
      `INSERT INTO doctor_attendance (doctor_id, work_date, shift, status, check_in, check_out, check_in_photo, check_out_photo, note)
       VALUES (?, ?, ?, 'hadir', NULL, ?, NULL, ?, NULL)
       ON DUPLICATE KEY UPDATE
         check_out = VALUES(check_out),
         check_out_photo = VALUES(check_out_photo),
         check_in = doctor_attendance.check_in,
         check_in_photo = doctor_attendance.check_in_photo`,
      [doctorId, workDate, shift, time, photoPath]
    );
  }

  const rows = await query(
    `SELECT da.*, d.name AS doctor_name
     FROM doctor_attendance da
     JOIN doctors d ON d.id = da.doctor_id
     WHERE da.doctor_id = ? AND da.work_date = ? AND da.shift = ?`,
    [doctorId, workDate, shift]
  );

  res.json({
    success: true,
    data: rows[0],
    recorded_at: time,
    recorded_mode: mode,
    shift,
  });
});

export const faceAttendance = asyncHandler(async (req, res) => {
  const mode = req.body.mode;
  if (mode !== 'in' && mode !== 'out') {
    throw new AppError('Mode absensi tidak valid', 400);
  }
  if (!req.file) {
    throw new AppError('Foto bukti scan wajah wajib dikirim', 422);
  }

  const scannedDescriptor = parseDescriptor(req.body.descriptor);
  const { date: workDate, time } = jakartaClockParts();
  const lat = numberOrNull(req.body.lat);
  const lng = numberOrNull(req.body.lng);
  const accuracy = numberOrNull(req.body.accuracy);
  const locationCheck = assertWithinClinicRadius(lat, lng, accuracy);
  const photoPath = `/uploads/attendance/${req.file.filename}`;
  const device = requestDevice(req);
  const requestedShift = normalizeShift(req.body.shift);

  if (req.user.role === 'nurse') {
    const userRows = await query(
      `SELECT id, name, face_descriptor, face_registered_at
       FROM users
       WHERE id = ? AND role = 'nurse' LIMIT 1`,
      [req.user.id]
    );
    const nurse = userRows[0];
    if (!nurse?.face_descriptor || !nurse?.face_registered_at) {
      throw new AppError('Wajah perawat belum didaftarkan. Daftarkan wajah di menu Profil.', 409);
    }

    const registeredDescriptor = parseDescriptor(nurse.face_descriptor);
    const similarity = Number(cosineSimilarity(scannedDescriptor, registeredDescriptor).toFixed(4));
    const threshold = Number(process.env.ATTENDANCE_FACE_THRESHOLD || DEFAULT_FACE_THRESHOLD);
    if (similarity < threshold) {
      throw new AppError(`Wajah tidak cocok. Similarity ${similarity}`, 403);
    }

    const shift =
      mode === 'in' || req.body.shift
        ? requestedShift
        : normalizeShift(
            (await openAttendanceForShift('staff_attendance', 'user_id', req.user.id, workDate))
              ?.shift || shiftForTime(time)
          );
    const checkInNote = mode === 'in' ? attendanceNoteForCheckIn(time, shift) : null;
    const currentRows = await query(
      'SELECT * FROM staff_attendance WHERE user_id = ? AND work_date = ? AND shift = ? LIMIT 1',
      [req.user.id, workDate, shift]
    );
    const current = currentRows[0];

    if (mode === 'in' && current?.check_in) {
      throw new AppError('Absensi masuk hari ini sudah tercatat', 409);
    }
    if (mode === 'out') {
      if (!current?.check_in) {
        throw new AppError('Belum ada absensi masuk hari ini', 409);
      }
      if (current?.check_out) {
        throw new AppError('Absensi pulang hari ini sudah tercatat', 409);
      }
    }

    if (mode === 'in') {
      await execute(
        `INSERT INTO staff_attendance
         (user_id, work_date, shift, status, check_in, check_out, check_in_photo,
          check_in_lat, check_in_lng, check_in_similarity, check_in_device, note)
         VALUES (?, ?, ?, 'hadir', ?, NULL, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = 'hadir',
           check_in = VALUES(check_in),
           check_in_photo = VALUES(check_in_photo),
           check_in_lat = VALUES(check_in_lat),
           check_in_lng = VALUES(check_in_lng),
           check_in_similarity = VALUES(check_in_similarity),
           check_in_device = VALUES(check_in_device),
           note = VALUES(note)`,
        [req.user.id, workDate, shift, time, photoPath, lat, lng, similarity, device, checkInNote]
      );
    } else {
      await execute(
        `UPDATE staff_attendance
         SET check_out = ?,
             check_out_photo = ?,
             check_out_lat = ?,
             check_out_lng = ?,
             check_out_similarity = ?,
             check_out_device = ?
         WHERE user_id = ? AND work_date = ? AND shift = ?`,
        [time, photoPath, lat, lng, similarity, device, req.user.id, workDate, shift]
      );
    }

    const rows = await query(
      `SELECT sa.*, u.name AS doctor_name
       FROM staff_attendance sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.user_id = ? AND sa.work_date = ? AND sa.shift = ?`,
      [req.user.id, workDate, shift]
    );

    return res.json({
      success: true,
      data: rows[0],
      recorded_at: time,
      recorded_mode: mode,
      shift,
      similarity,
      distance_meters: Math.round(locationCheck.distance),
      effective_distance_meters: Math.round(locationCheck.effectiveDistance),
      gps_accuracy_tolerance_meters: Math.round(locationCheck.accuracyTolerance),
    });
  }

  const doctorId = await getDoctorIdForUser(req.user.id);
  if (!doctorId) {
    throw new AppError('Akun belum terhubung ke data dokter', 403);
  }

  const doctorRows = await query(
    `SELECT id, face_descriptor, face_registered_at
     FROM doctors
     WHERE id = ? LIMIT 1`,
    [doctorId]
  );
  const doctor = doctorRows[0];
  if (!doctor?.face_descriptor || !doctor?.face_registered_at) {
    throw new AppError('Wajah dokter belum didaftarkan. Daftarkan wajah di menu Profil.', 409);
  }

  const registeredDescriptor = parseDescriptor(doctor.face_descriptor);
  const similarity = Number(cosineSimilarity(scannedDescriptor, registeredDescriptor).toFixed(4));
  const threshold = Number(process.env.ATTENDANCE_FACE_THRESHOLD || DEFAULT_FACE_THRESHOLD);
  if (similarity < threshold) {
    throw new AppError(`Wajah tidak cocok. Similarity ${similarity}`, 403);
  }

  const shift =
    mode === 'in' || req.body.shift
      ? requestedShift
      : normalizeShift(
          (await openAttendanceForShift('doctor_attendance', 'doctor_id', doctorId, workDate))
            ?.shift || shiftForTime(time)
        );
  const checkInNote = mode === 'in' ? attendanceNoteForCheckIn(time, shift) : null;
  const currentRows = await query(
    'SELECT * FROM doctor_attendance WHERE doctor_id = ? AND work_date = ? AND shift = ? LIMIT 1',
    [doctorId, workDate, shift]
  );
  const current = currentRows[0];

  if (mode === 'in' && current?.check_in) {
    throw new AppError('Absensi masuk hari ini sudah tercatat', 409);
  }
  if (mode === 'out') {
    if (!current?.check_in) {
      throw new AppError('Belum ada absensi masuk hari ini', 409);
    }
    if (current?.check_out) {
      throw new AppError('Absensi pulang hari ini sudah tercatat', 409);
    }
  }

  if (mode === 'in') {
    await execute(
      `INSERT INTO doctor_attendance
       (doctor_id, work_date, shift, status, check_in, check_out, check_in_photo,
        check_in_lat, check_in_lng, check_in_similarity, check_in_device, note)
       VALUES (?, ?, ?, 'hadir', ?, NULL, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = 'hadir',
         check_in = VALUES(check_in),
         check_in_photo = VALUES(check_in_photo),
         check_in_lat = VALUES(check_in_lat),
         check_in_lng = VALUES(check_in_lng),
         check_in_similarity = VALUES(check_in_similarity),
         check_in_device = VALUES(check_in_device),
         note = VALUES(note)`,
      [doctorId, workDate, shift, time, photoPath, lat, lng, similarity, device, checkInNote]
    );
  } else {
    await execute(
      `UPDATE doctor_attendance
       SET check_out = ?,
           check_out_photo = ?,
           check_out_lat = ?,
           check_out_lng = ?,
           check_out_similarity = ?,
           check_out_device = ?
       WHERE doctor_id = ? AND work_date = ? AND shift = ?`,
      [time, photoPath, lat, lng, similarity, device, doctorId, workDate, shift]
    );
  }

  const rows = await query(
    `SELECT da.*, d.name AS doctor_name
     FROM doctor_attendance da
     JOIN doctors d ON d.id = da.doctor_id
     WHERE da.doctor_id = ? AND da.work_date = ? AND da.shift = ?`,
    [doctorId, workDate, shift]
  );

  res.json({
    success: true,
    data: rows[0],
    recorded_at: time,
    recorded_mode: mode,
    shift,
    similarity,
    distance_meters: Math.round(locationCheck.distance),
    effective_distance_meters: Math.round(locationCheck.effectiveDistance),
    gps_accuracy_tolerance_meters: Math.round(locationCheck.accuracyTolerance),
  });
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError('ID tidak valid', 400);
  }
  const table = req.query.type === 'nurse' ? 'staff_attendance' : 'doctor_attendance';
  const result = await execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (!result.affectedRows) {
    throw new AppError('Data absensi tidak ditemukan', 404);
  }
  res.json({ success: true, message: 'Absensi dihapus' });
});

export const upsertAttendance = asyncHandler(async (req, res) => {
  const { doctor_id: bodyDoctorId, work_date, shift: bodyShift, status, check_in, check_out, note } = req.body;

  let doctorId;
  if (req.user.role === 'doctor') {
    doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      throw new AppError('Akun belum terhubung ke data dokter', 403);
    }
  } else if (req.user.role === 'admin' || req.user.role === 'nurse') {
    doctorId = bodyDoctorId ? Number(bodyDoctorId) : null;
    if (!doctorId) {
      throw new AppError('doctor_id wajib untuk admin', 400);
    }
  } else {
    throw new AppError('Akses ditolak', 403);
  }

  const dateStr = String(work_date).slice(0, 10);
  const shift = normalizeShift(bodyShift || (check_in ? shiftForTime(check_in) : 'shift1'));

  await execute(
    `INSERT INTO doctor_attendance (doctor_id, work_date, shift, status, check_in, check_out, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       check_in = VALUES(check_in),
       check_out = VALUES(check_out),
       note = VALUES(note)`,
    [
      doctorId,
      dateStr,
      shift,
      status,
      check_in || null,
      check_out || null,
      note ? sanitizeString(note, 500) : null,
    ]
  );

  const rows = await query(
    `SELECT da.*, d.name AS doctor_name
     FROM doctor_attendance da
     JOIN doctors d ON d.id = da.doctor_id
     WHERE da.doctor_id = ? AND da.work_date = ? AND da.shift = ?`,
    [doctorId, dateStr, shift]
  );
  res.json({ success: true, data: rows[0] });
});
