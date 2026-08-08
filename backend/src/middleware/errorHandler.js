import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  const status =
    err instanceof AppError ? err.statusCode : err.statusCode || 500;

  if (status >= 500 || err?.errno || err?.code) {
    console.error('[ERROR]', {
      method: req.method,
      path: req.originalUrl,
      status,
      code: err?.code,
      errno: err?.errno,
      message: err?.message,
      sqlMessage: err?.sqlMessage,
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Ukuran file terlalu besar (maks. 2MB)',
    });
  }
  if (err?.message === 'Hanya gambar JPEG/PNG/WebP/GIF') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (res.headersSent) {
    return next(err);
  }

  const mysqlErrno = err?.errno;
  if (mysqlErrno === 1146) {
    return res.status(503).json({
      success: false,
      message:
        'Tabel basis data tidak ditemukan. Jalankan skrip SQL migrasi di folder database (mis. migration_002_doctor_features.sql) pada basis data MySQL, lalu restart server.',
      ...(process.env.NODE_ENV !== 'production' && err.sqlMessage
        ? { sqlMessage: err.sqlMessage }
        : {}),
    });
  }
  if (mysqlErrno === 1054) {
    return res.status(503).json({
      success: false,
      message:
        'Struktur tabel belum lengkap. Untuk stok obat jalankan database/migration_003_medicine_stock.sql pada basis data Anda.',
      ...(process.env.NODE_ENV !== 'production' && err.sqlMessage
        ? { sqlMessage: err.sqlMessage }
        : {}),
    });
  }

  const message =
    err instanceof AppError
      ? err.message
      : status === 500
        ? 'Terjadi kesalahan server'
        : err.message || 'Error';

  const body = {
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && err.stack
      ? { stack: err.stack }
      : {}),
    ...(err instanceof AppError && err.details ? { details: err.details } : {}),
  };

  res.status(status).json(body);
}
