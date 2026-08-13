import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { uploadDoctorPhoto, optionalDoctorPhotoUpload, uploadAttendanceSelfie } from '../middleware/upload.js';

import * as authController from '../controllers/auth.controller.js';
import * as patientController from '../controllers/patient.controller.js';
import * as doctorController from '../controllers/doctor.controller.js';
import * as medicalRecordController from '../controllers/medicalRecord.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as paymentController from '../controllers/payment.controller.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as reportController from '../controllers/report.controller.js';
import * as userController from '../controllers/user.controller.js';
import * as medicineController from '../controllers/medicine.controller.js';
import * as treatmentController from '../controllers/treatment.controller.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import * as doctorSalaryController from '../controllers/doctorSalary.controller.js';

import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  patientSchema,
  patientQuerySchema,
  medicalRecordSchema,
  appointmentSchema,
  appointmentStatusSchema,
  paymentSchema,
  doctorSchema,
  toothUpsertSchema,
  paymentUpdateSchema,
  userAdminCreateSchema,
  userAdminResetPasswordSchema,
  userAdminUpdateSchema,
  userListQuerySchema,
  medicineListQuerySchema,
  medicineBodySchema,
  medicineStockAdjustSchema,
  treatmentBodySchema,
  attendanceMonthQuerySchema,
  attendanceUpsertSchema,
  attendanceScanSchema,
  faceRegistrationSchema,
  doctorSalaryListQuerySchema,
  doctorSalaryCreateSchema,
  changeMyPasswordSchema,
  patchMyProfileSchema,
} from '../validators/schemas.js';

const router = Router();

/** ----- Auth ----- */
router.post(
  '/auth/login',
  loginLimiter,
  validateBody(loginSchema),
  authController.login
);
router.post(
  '/auth/forgot-password',
  loginLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/auth/reset-password',
  loginLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.get('/auth/me', authenticate, authController.me);
router.patch(
  '/auth/me',
  authenticate,
  optionalDoctorPhotoUpload,
  validateBody(patchMyProfileSchema),
  authController.patchMe
);
router.patch(
  '/auth/me/password',
  authenticate,
  validateBody(changeMyPasswordSchema),
  authController.changeMyPassword
);
router.patch(
  '/auth/me/face',
  authenticate,
  authorize('doctor', 'nurse'),
  validateBody(faceRegistrationSchema),
  authController.registerMyFace
);

/** ----- Dashboard ----- */
router.get(
  '/dashboard/stats',
  authenticate,
  dashboardController.stats
);
router.get(
  '/dashboard/today-appointments',
  authenticate,
  dashboardController.todayAppointments
);
router.get(
  '/dashboard/recent-activity',
  authenticate,
  dashboardController.recentActivity
);

/** ----- Patients ----- */
router.get(
  '/patients',
  authenticate,
  validateQuery(patientQuerySchema),
  patientController.listPatients
);
router.get('/patients/:id', authenticate, patientController.getPatient);
router.post(
  '/patients',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(patientSchema),
  patientController.createPatient
);
router.put(
  '/patients/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(patientSchema),
  patientController.updatePatient
);
router.delete(
  '/patients/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  patientController.deletePatient
);

/** ----- Doctors ----- */
router.get('/doctors', authenticate, doctorController.listDoctors);
router.post(
  '/doctors',
  authenticate,
  authorize('admin'),
  uploadDoctorPhoto.single('photo'),
  validateBody(doctorSchema),
  doctorController.createDoctor
);
router.put(
  '/doctors/:id',
  authenticate,
  authorize('admin'),
  uploadDoctorPhoto.single('photo'),
  validateBody(doctorSchema),
  doctorController.updateDoctor
);
router.delete(
  '/doctors/:id',
  authenticate,
  authorize('admin'),
  doctorController.deleteDoctor
);

/** ----- Users (admin) ----- */
router.get(
  '/users/nurses',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  userController.listNurses
);
router.get(
  '/users',
  authenticate,
  authorize('admin'),
  validateQuery(userListQuerySchema),
  userController.listUsers
);
router.post(
  '/users',
  authenticate,
  authorize('admin'),
  validateBody(userAdminCreateSchema),
  userController.createUser
);
router.put(
  '/users/:id',
  authenticate,
  authorize('admin'),
  validateBody(userAdminUpdateSchema),
  userController.updateUser
);
router.patch(
  '/users/:id/password',
  authenticate,
  authorize('admin'),
  validateBody(userAdminResetPasswordSchema),
  userController.resetUserPassword
);
router.delete(
  '/users/:id',
  authenticate,
  authorize('admin'),
  userController.deleteUser
);

/** ----- Medical records ----- */
router.get(
  '/medical-records',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  medicalRecordController.listMedicalRecords
);
router.get(
  '/medical-records/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  medicalRecordController.getMedicalRecord
);
router.post(
  '/medical-records',
  authenticate,
  authorize('admin', 'doctor'),
  validateBody(medicalRecordSchema),
  medicalRecordController.createMedicalRecord
);
router.put(
  '/medical-records/:id',
  authenticate,
  authorize('admin', 'doctor'),
  validateBody(medicalRecordSchema),
  medicalRecordController.updateMedicalRecord
);
router.patch(
  '/medical-records/:id/teeth',
  authenticate,
  authorize('admin', 'doctor'),
  validateBody(toothUpsertSchema),
  medicalRecordController.upsertTooth
);
router.delete(
  '/medical-records/:id',
  authenticate,
  authorize('admin'),
  medicalRecordController.deleteMedicalRecord
);

/** ----- Appointments ----- */
router.get('/appointments', authenticate, appointmentController.listAppointments);
router.post(
  '/appointments',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(appointmentSchema),
  appointmentController.createAppointment
);
router.put(
  '/appointments/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(appointmentSchema),
  appointmentController.updateAppointment
);
router.patch(
  '/appointments/:id/status',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(appointmentStatusSchema),
  appointmentController.updateAppointmentStatus
);
router.delete(
  '/appointments/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  appointmentController.deleteAppointment
);

/** ----- Payments ----- */
router.get('/payments', authenticate, paymentController.listPayments);
router.post(
  '/payments',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(paymentSchema),
  paymentController.createPayment
);
router.put(
  '/payments/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateBody(paymentUpdateSchema),
  paymentController.updatePayment
);

/** ----- Medicines (master obat) ----- */
router.get(
  '/medicines',
  authenticate,
  validateQuery(medicineListQuerySchema),
  medicineController.listMedicines
);
router.post(
  '/medicines',
  authenticate,
  authorize('admin'),
  validateBody(medicineBodySchema),
  medicineController.createMedicine
);
router.put(
  '/medicines/:id',
  authenticate,
  authorize('admin'),
  validateBody(medicineBodySchema),
  medicineController.updateMedicine
);
router.patch(
  '/medicines/:id/stock',
  authenticate,
  authorize('admin'),
  validateBody(medicineStockAdjustSchema),
  medicineController.adjustMedicineStock
);
router.delete(
  '/medicines/:id',
  authenticate,
  authorize('admin'),
  medicineController.deleteMedicine
);

/** ----- Treatments (master tindakan) ----- */
router.get('/treatments', authenticate, treatmentController.listTreatments);
router.post(
  '/treatments',
  authenticate,
  authorize('admin'),
  validateBody(treatmentBodySchema),
  treatmentController.createTreatment
);
router.put(
  '/treatments/:id',
  authenticate,
  authorize('admin'),
  validateBody(treatmentBodySchema),
  treatmentController.updateTreatment
);
router.delete(
  '/treatments/:id',
  authenticate,
  authorize('admin'),
  treatmentController.deleteTreatment
);

/** ----- Absensi dokter ----- */
router.get(
  '/attendance/qr-payloads',
  authenticate,
  authorize('admin'),
  attendanceController.getAttendanceQrPayloads
);
router.post(
  '/attendance/scan',
  authenticate,
  authorize('doctor'),
  validateBody(attendanceScanSchema),
  attendanceController.scanAttendance
);
router.post(
  '/attendance/selfie',
  authenticate,
  authorize('doctor'),
  uploadAttendanceSelfie.single('photo'),
  attendanceController.selfieAttendance
);
router.post(
  '/attendance/face',
  authenticate,
  authorize('doctor', 'nurse'),
  uploadAttendanceSelfie.single('photo'),
  attendanceController.faceAttendance
);
router.get(
  '/attendance',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  validateQuery(attendanceMonthQuerySchema),
  attendanceController.listAttendance
);
router.put(
  '/attendance',
  authenticate,
  authorize('admin', 'doctor'),
  validateBody(attendanceUpsertSchema),
  attendanceController.upsertAttendance
);
router.delete(
  '/attendance/:id',
  authenticate,
  authorize('admin'),
  attendanceController.deleteAttendance
);
router.get(
  '/doctor-salaries',
  authenticate,
  authorize('admin', 'doctor'),
  validateQuery(doctorSalaryListQuerySchema),
  doctorSalaryController.listDoctorSalaries
);
router.get(
  '/doctor-salaries/actions',
  authenticate,
  authorize('admin', 'doctor'),
  doctorSalaryController.listDoctorSalaryActions
);
router.post(
  '/doctor-salaries',
  authenticate,
  authorize('admin'),
  validateBody(doctorSalaryCreateSchema),
  doctorSalaryController.createDoctorSalary
);
router.delete(
  '/doctor-salaries/:id',
  authenticate,
  authorize('admin'),
  doctorSalaryController.deleteDoctorSalary
);

/** ----- Reports (data untuk PDF/Excel di client) ----- */
router.get('/reports/patients', authenticate, reportController.patientsReport);
router.get('/reports/payments', authenticate, reportController.paymentsReport);
router.get(
  '/reports/medical-records',
  authenticate,
  reportController.medicalRecordsReport
);
router.get(
  '/reports/appointments',
  authenticate,
  reportController.appointmentsReport
);

export default router;
