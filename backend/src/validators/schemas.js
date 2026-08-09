import { z } from 'zod';
import { isValidFdiToothNumber } from '../constants/fdiTeeth.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/, 'Kode reset harus 6 digit'),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

export const changeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(6).max(128),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

export const patientSchema = z.object({
  nik: z.string().max(32).optional().nullable(),
  name: z.string().min(2).max(255),
  gender: z.enum(['L', 'P']),
  birth_date: z.string(), // YYYY-MM-DD
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(2000).optional().nullable(),
  blood_type: z.string().max(8).optional().nullable(),
});

export const medicalRecordSchema = z.object({
  patient_id: z.coerce.number().int().positive(),
  doctor_id: z.coerce.number().int().positive(),
  complaint: z.string().max(5000).optional().nullable(),
  diagnosis: z.string().max(5000).optional().nullable(),
  treatment: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  visit_date: z.string(),
  odontograms: z
    .array(
      z.object({
        tooth_number: z.coerce
          .number()
          .int()
          .refine(isValidFdiToothNumber, 'Nomor gigi FDI tidak valid'),
        condition_type: z.enum([
          'sehat',
          'karies',
          'tambalan',
          'dicabut',
          'implant',
          'akar',
        ]),
        notes: z.string().max(500).optional().nullable(),
      })
    )
    .optional()
    .default([]),
  prescriptions: z
    .array(
      z.object({
        medicine_name: z.string().min(1).max(255),
        dosage: z.string().max(255).optional().nullable(),
        instruction: z.string().max(1000).optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

export const appointmentSchema = z.object({
  patient_id: z.coerce.number().int().positive(),
  doctor_id: z.coerce.number().int().positive(),
  appointment_date: z.string(),
  status: z
    .enum(['menunggu', 'proses', 'selesai', 'batal'])
    .optional()
    .default('menunggu'),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(['menunggu', 'proses', 'selesai', 'batal']),
});

export const paymentSchema = z.object({
  medical_record_id: z.coerce.number().int().positive(),
  total_price: z.coerce.number().nonnegative(),
  payment_method: z
    .enum(['tunai', 'kartu', 'transfer', 'qris', 'lainnya'])
    .optional()
    .default('tunai'),
  payment_status: z
    .enum(['belum_bayar', 'lunas', 'sebagian'])
    .optional()
    .default('belum_bayar'),
});

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

export const doctorSchema = z.object({
  name: z.string().min(2).max(255),
  specialist: z.preprocess(
    emptyToNull,
    z.union([z.string().max(255), z.null()]).optional()
  ),
  sip_number: z.preprocess(
    emptyToNull,
    z.union([z.string().max(100), z.null()]).optional()
  ),
  phone: z.preprocess(
    emptyToNull,
    z.union([z.string().max(50), z.null()]).optional()
  ),
  user_id: z.preprocess((v) => {
    if (v === '' || v === undefined || v === null) return null;
    return Number(v);
  }, z.number().int().positive().nullable().optional()),
});

export const patientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional().default(''),
  gender: z.enum(['L', 'P']).optional(),
});

export const toothUpsertSchema = z.object({
  tooth_number: z.coerce
    .number()
    .int()
    .refine(isValidFdiToothNumber, 'Nomor gigi FDI tidak valid'),
  condition_type: z.enum([
    'sehat',
    'karies',
    'tambalan',
    'dicabut',
    'implant',
    'akar',
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export const paymentUpdateSchema = z.object({
  total_price: z.coerce.number().nonnegative(),
  payment_method: z.enum(['tunai', 'kartu', 'transfer', 'qris', 'lainnya']),
  payment_status: z.enum(['belum_bayar', 'lunas', 'sebagian']),
});

const profileEmptyToNull = (v) =>
  v === '' || v === undefined || v === null ? null : v;

/** Profil diri (semua peran); dokter boleh kirim specialist/sip + foto multipart. */
export const patchMyProfileSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.preprocess(
    profileEmptyToNull,
    z
      .union([z.string().min(8).max(50), z.null()])
      .optional()
      .nullable()
  ),
  specialist: z.preprocess(
    profileEmptyToNull,
    z.union([z.string().max(255), z.null()]).optional()
  ),
  sip_number: z.preprocess(
    profileEmptyToNull,
    z.union([z.string().max(100), z.null()]).optional()
  ),
  motto: z.preprocess(
    profileEmptyToNull,
    z.union([z.string().max(500), z.null()]).optional()
  ),
});

/** Admin settings: tanpa ubah role */
export const userAdminUpdateSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z
    .union([z.string().max(50), z.literal('')])
    .optional()
    .nullable(),
  is_active: z.preprocess(
    (v) => v === true || v === 1 || v === '1' || v === 'true',
    z.boolean()
  ),
});

export const userAdminCreateSchema = z
  .object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    phone: z.string().min(8).max(50),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    role: z.enum(['doctor', 'nurse']).default('nurse'),
    is_active: z.preprocess((v) => {
      if (v === undefined || v === null) return true;
      if (v === false || v === 0 || v === '0' || v === 'false') return false;
      return true;
    }, z.boolean()),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

export const userAdminResetPasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

export const userListQuerySchema = z.object({
  role: z.enum(['doctor', 'nurse']).optional(),
});

export const medicineListQuerySchema = z.object({
  active_only: z.string().optional(),
  q: z.string().optional(),
});

const medEmptyToNull = (v) =>
  v === '' || v === undefined || v === null ? null : v;

export const medicineBodySchema = z.object({
  name: z.string().min(1).max(255),
  form: z.preprocess(medEmptyToNull, z.union([z.string().max(100), z.null()])).optional(),
  strength: z.preprocess(medEmptyToNull, z.union([z.string().max(120), z.null()])).optional(),
  notes: z.preprocess(medEmptyToNull, z.union([z.string().max(2000), z.null()])).optional(),
  stock_qty: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? 0 : v),
    z.coerce.number().int().nonnegative()
  ),
  is_active: z.preprocess((v) => {
    if (v === undefined || v === null) return true;
    if (v === false || v === 0 || v === '0' || v === 'false') return false;
    return true;
  }, z.boolean()),
});

export const medicineStockAdjustSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, { message: 'Jumlah tambah/kurang tidak boleh 0' }),
});

export const faceRegistrationSchema = z.object({
  descriptor: z.array(z.coerce.number().finite()).min(32).max(1024),
});

export const treatmentBodySchema = z.object({
  name: z.string().min(1).max(255),
  icd_code: z.preprocess(medEmptyToNull, z.union([z.string().max(50), z.null()])).optional(),
  icd9_code: z.preprocess(medEmptyToNull, z.union([z.string().max(50), z.null()])).optional(),
  tooth_element: z.preprocess(medEmptyToNull, z.union([z.string().max(100), z.null()])).optional(),
  price: z.coerce.number().nonnegative(),
  is_active: z.preprocess((v) => {
    if (v === undefined || v === null) return true;
    if (v === false || v === 0 || v === '0' || v === 'false') return false;
    return true;
  }, z.boolean()),
});

export const attendanceMonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  type: z.enum(['all', 'doctor', 'nurse']).optional(),
  doctor_id: z.coerce.number().int().positive().optional(),
  nurse_id: z.coerce.number().int().positive().optional(),
});

export const attendanceUpsertSchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
  work_date: z.string().min(8),
  shift: z.enum(['shift1', 'shift2']).optional(),
  status: z.enum(['hadir', 'izin', 'sakit', 'cuti', 'alfa']),
  check_in: z.string().max(8).optional().nullable(),
  check_out: z.string().max(8).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const attendanceScanSchema = z.object({
  mode: z.enum(['in', 'out']),
  payload: z.string().min(1).max(512),
});

export const doctorSalaryListQuerySchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
});

export const doctorSalaryCreateSchema = z.object({
  doctor_id: z.coerce.number().int().positive(),
  period_month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.coerce.number().nonnegative(),
  notes: z.string().max(2000).optional().nullable(),
});
