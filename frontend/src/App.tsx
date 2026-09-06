import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/auth/Login';

import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientTriage } from './pages/patient/PatientTriage';
import { PatientAppointments } from './pages/patient/PatientAppointments';
import { PatientRecords } from './pages/patient/PatientRecords';
import { PatientReferrals } from './pages/patient/PatientReferrals';
import { PatientFollowUps } from './pages/patient/PatientFollowUps';

import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorProfilePage } from './pages/doctor/DoctorProfile';
import { DoctorAppointments } from './pages/doctor/DoctorAppointments';
import { DoctorWorkspace } from './pages/doctor/DoctorWorkspace';
import { DoctorPatients } from './pages/doctor/DoctorPatients';
import { DoctorReferrals } from './pages/doctor/DoctorReferrals';
import { DoctorFollowUps } from './pages/doctor/DoctorFollowUps';

import {
  HealthWorkerDashboard, HealthWorkerInventory, HealthWorkerReferrals, HealthWorkerConsultations, HealthWorkerPatients
} from './pages/healthworker';

import {
  AdminDashboard, AdminFacilities, AdminUsers, AdminDoctors, AdminInventory
} from './pages/admin';

function App() {
  const { token, userRole } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />

      {/* Patient Routes */}
      <Route path="/patient" element={<ProtectedRoute allowedRoles={['PATIENT']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<PatientDashboard />} />
        <Route path="triage" element={<PatientTriage />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="records" element={<PatientRecords />} />
        <Route path="referrals" element={<PatientReferrals />} />
        <Route path="follow-ups" element={<PatientFollowUps />} />
      </Route>

      {/* Doctor Routes */}
      <Route path="/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DoctorDashboard />} />
        <Route path="profile" element={<DoctorProfilePage />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="workspace/:id" element={<DoctorWorkspace />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="referrals" element={<DoctorReferrals />} />
        <Route path="follow-ups" element={<DoctorFollowUps />} />
      </Route>

      {/* Health Worker Routes */}
      <Route path="/health-worker" element={<ProtectedRoute allowedRoles={['HEALTH_WORKER']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<HealthWorkerDashboard />} />
        <Route path="inventory" element={<HealthWorkerInventory />} />
        <Route path="referrals" element={<HealthWorkerReferrals />} />
        <Route path="consultations" element={<HealthWorkerConsultations />} />
        <Route path="patients" element={<HealthWorkerPatients />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="facilities" element={<AdminFacilities />} />
        <Route path="doctors" element={<AdminDoctors />} />
        <Route path="inventory" element={<AdminInventory />} />
      </Route>

      {/* Fallback Router */}
      <Route path="/*" element={
        !token ? <Navigate to="/login" replace /> :
        userRole === 'PATIENT' ? <Navigate to="/patient" replace /> :
        userRole === 'DOCTOR' ? <Navigate to="/doctor" replace /> :
        userRole === 'HEALTH_WORKER' ? <Navigate to="/health-worker" replace /> :
        userRole === 'ADMIN' ? <Navigate to="/admin" replace /> :
        <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

export default App;