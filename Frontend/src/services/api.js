import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ───────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  API.post('/auth/login', { username, password });

// ─── Admin: Dashboard ───────────────────────────────────────────────────────
export const getDashboardStats = () =>
  API.get('/admin/dashboard/stats');

// ─── Admin: Teachers ────────────────────────────────────────────────────────
export const getTeachers = () =>
  API.get('/admin/teachers');

export const addTeacher = (name) =>
  API.post('/admin/teachers', { name });

export const editTeacher = (id, name) =>
  API.put(`/admin/teachers/${id}`, { name });

export const deleteTeacher = (id) =>
  API.delete(`/admin/teachers/${id}`);

export const uploadSchedule = (teacherId, formData) =>
  API.post(`/admin/teachers/${teacherId}/schedule`, formData);

export const getTeacherScheduleAdmin = (teacherId) =>
  API.get(`/admin/teachers/${teacherId}/schedule`);

// ─── Admin: Students ────────────────────────────────────────────────────────
export const uploadStudents = (formData) =>
  API.post('/admin/students/upload', formData);

export const getStudents = (subjectId) =>
  API.get('/admin/students', { params: subjectId ? { subject_id: subjectId } : {} });

export const getSubjects = () =>
  API.get('/admin/subjects');

// ─── Admin: Credentials ────────────────────────────────────────────────────
export const changeAdminCredentials = (data) =>
  API.put('/admin/credentials', data);

// ─── Teacher: Dashboard ────────────────────────────────────────────────────
export const getTeacherDashboard = () =>
  API.get('/teacher/dashboard');

// ─── Teacher: Schedule ─────────────────────────────────────────────────────
export const getTeacherSchedule = () =>
  API.get('/teacher/schedule');

// ─── Teacher: Attendance ───────────────────────────────────────────────────
export const getAttendanceFilters = () =>
  API.get('/teacher/attendance/filters');

export const getStudentsForAttendance = (subjectId, classId) =>
  API.get('/teacher/attendance/students', {
    params: { subject_id: subjectId, ...(classId ? { class_id: classId } : {}) }
  });

export const uploadAttendanceVideo = (formData) =>
  API.post('/teacher/attendance/video', formData);

export const saveAttendance = (data) =>
  API.post('/teacher/attendance', data);

export const getAttendanceRecords = (params) =>
  API.get('/teacher/attendance/records', { params });

export const editAttendanceRecord = (id, data) =>
  API.put(`/teacher/attendance/${id}`, data);

// ─── Teacher: Analytics ────────────────────────────────────────────────────
export const getAnalytics = () =>
  API.get('/teacher/analytics');

export default API;