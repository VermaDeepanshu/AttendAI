import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/global.css';

import LandingPage from './pages/Landing/LandingPage';
import RoleSelect from './pages/Landing/RoleSelect';
import LoginPage from './pages/Landing/LoginPage';

import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminTeachers from './pages/Admin/AdminTeachers';
import AdminStudents from './pages/Admin/AdminStudents';
import AdminCredentials from './pages/Admin/AdminCredentials';

import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import TeacherAttendance from './pages/Teacher/TeacherAttendance';
import TeacherRecords from './pages/Teacher/TeacherRecords';
import TeacherAnalytics from './pages/Teacher/TeacherAnalytics';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/select-role" element={<RoleSelect />} />
        <Route path="/login/:role" element={<LoginPage />} />

        <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/teachers"  element={<PrivateRoute role="admin"><AdminTeachers /></PrivateRoute>} />
        <Route path="/admin/students"  element={<PrivateRoute role="admin"><AdminStudents /></PrivateRoute>} />
        <Route path="/admin/credentials" element={<PrivateRoute role="admin"><AdminCredentials /></PrivateRoute>} />

        <Route path="/teacher/dashboard"  element={<PrivateRoute role="teacher"><TeacherDashboard /></PrivateRoute>} />
        <Route path="/teacher/attendance" element={<PrivateRoute role="teacher"><TeacherAttendance /></PrivateRoute>} />
        <Route path="/teacher/records"    element={<PrivateRoute role="teacher"><TeacherRecords /></PrivateRoute>} />
        <Route path="/teacher/analytics"  element={<PrivateRoute role="teacher"><TeacherAnalytics /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
