import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { dashboardPath } from '@/lib/dashboardPaths';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

import AppLayout from '@/layouts/AppLayout';
import Login from '@/pages/auth/Login';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import HomeRedirect from '@/components/auth/HomeRedirect';
import RoleDashboard from '@/components/auth/RoleDashboard';
import PatientsList from '@/pages/patients/PatientsList';
import PatientForm from '@/pages/patients/PatientForm';
import PatientDetail from '@/pages/patients/PatientDetail';
import MedicalRecordsList from '@/pages/medical-records/MedicalRecordsList';
import MedicalRecordForm from '@/pages/medical-records/MedicalRecordForm';
import MedicalRecordDetail from '@/pages/medical-records/MedicalRecordDetail';
import OdontogramReportPage from '@/pages/medical-records/OdontogramReportPage';
import OdontogramPage from '@/pages/odontogram/OdontogramPage';
import Appointments from '@/pages/appointments/Appointments';
import Payments from '@/pages/payments/Payments';
import Reports from '@/pages/reports/Reports';
import RevenuePage from '@/pages/revenue/RevenuePage';
import SettingsLayout from '@/pages/settings/SettingsLayout';
import ProfileSettings from '@/pages/settings/ProfileSettings';
import DoctorsSettings from '@/pages/settings/DoctorsSettings';
import TreatmentsSettings from '@/pages/settings/TreatmentsSettings';
import UsersSettings from '@/pages/settings/UsersSettings';
import AttendancePage from '@/pages/doctor-tools/AttendancePage';
import DoctorSalaryPage from '@/pages/doctor-tools/DoctorSalaryPage';
import MedicinesPage from '@/pages/doctor-tools/MedicinesPage';

function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

function RoleGate({ allow, children }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return null;
  if (!allow.includes(role)) {
    return <Navigate to={dashboardPath(role)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/medical-records/:id/laporan-odontogram"
          element={
            <ProtectedRoute>
              <OdontogramReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="admin/dashboard" element={<RoleDashboard expectedRole="admin" />} />
          <Route path="doctor/dashboard" element={<RoleDashboard expectedRole="doctor" />} />
          <Route path="nurse/dashboard" element={<RoleDashboard expectedRole="nurse" />} />

          <Route path="patients" element={<RoleGate allow={['admin', 'doctor', 'nurse']}><PatientsList /></RoleGate>} />
          <Route path="patients/new" element={<RoleGate allow={['admin', 'doctor', 'nurse']}><PatientForm /></RoleGate>} />
          <Route path="patients/:id" element={<RoleGate allow={['admin', 'doctor', 'nurse']}><PatientDetail /></RoleGate>} />
          <Route path="patients/:id/edit" element={<RoleGate allow={['admin', 'doctor', 'nurse']}><PatientForm /></RoleGate>} />

          <Route path="medical-records" element={<RoleGate allow={['admin', 'doctor']}><MedicalRecordsList /></RoleGate>} />
          <Route path="medical-records/new" element={<RoleGate allow={['admin', 'doctor']}><MedicalRecordForm /></RoleGate>} />
          <Route path="medical-records/:id/edit" element={<RoleGate allow={['admin', 'doctor']}><MedicalRecordForm /></RoleGate>} />
          <Route path="medical-records/:id" element={<RoleGate allow={['admin', 'doctor']}><MedicalRecordDetail /></RoleGate>} />

          <Route path="odontogram" element={<RoleGate allow={['doctor']}><OdontogramPage /></RoleGate>} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="payments" element={<RoleGate allow={['admin', 'nurse']}><Payments /></RoleGate>} />
          <Route path="absensi" element={<RoleGate allow={['admin', 'doctor', 'nurse']}><AttendancePage /></RoleGate>} />
          <Route path="gaji-dokter" element={<RoleGate allow={['admin', 'doctor']}><DoctorSalaryPage /></RoleGate>} />
          <Route path="obat" element={<RoleGate allow={['admin', 'doctor']}><MedicinesPage /></RoleGate>} />
          <Route path="reports" element={<RoleGate allow={['admin']}><Reports /></RoleGate>} />
          <Route path="pendapatan" element={<RoleGate allow={['admin']}><RevenuePage /></RoleGate>} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="doctors" element={<DoctorsSettings />} />
            <Route path="treatments" element={<TreatmentsSettings />} />
            <Route path="users" element={<UsersSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
