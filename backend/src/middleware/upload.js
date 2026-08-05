import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads/doctors');
const attendanceUploadDir = path.join(__dirname, '../../uploads/attendance');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(attendanceUploadDir)) {
  fs.mkdirSync(attendanceUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `doctor-${Date.now()}${ext}`);
  },
});

const attendanceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, attendanceUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `attendance-${Date.now()}${ext}`);
  },
});

const imageFileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
  if (!ok) return cb(new Error('Hanya gambar JPEG/PNG/WebP/GIF'));
  cb(null, true);
};

export const uploadDoctorPhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadAttendanceSelfie = multer({
  storage: attendanceStorage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

/** multipart/form-data saja; JSON biarkan ke express.json */
export function optionalDoctorPhotoUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return uploadDoctorPhoto.single('photo')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
}
