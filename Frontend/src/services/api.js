import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (username, password) =>
  API.post('/auth/login', { username, password });

export const getDashboardStats = () =>
  API.get('/admin/dashboard/stats');

export const getTeachers = () =>
  API.get('/admin/teachers');

export const addTeacher = (name) =>
  API.post('/admin/teachers', { name });

export const deleteTeacher = (id) =>
  API.delete(`/admin/teachers/${id}`);

export const uploadStudents = (formData) =>
  API.post('/admin/students/upload', formData);

export const getStudents = () =>
  API.get('/admin/students');

export const uploadSchedule = (teacherId, formData) =>
  API.post(`/admin/teachers/${teacherId}/schedule`, formData);

export const getTeacherSchedule = () =>
  API.get('/teacher/schedule');

export const uploadAttendanceVideo = (formData) =>
  API.post('/teacher/attendance/video', formData);

export const saveAttendance = (data) =>
  API.post('/teacher/attendance', data);

export const getAttendanceRecords = () =>
  API.get('/teacher/attendance/records');

export const getAnalytics = () =>
  API.get('/teacher/analytics');

export const changeAdminCredentials = (data) =>
  API.put('/admin/credentials', data);

export default API;