import React from 'react';
import TeacherLayout from '../../components/TeacherLayout';

export default function TeacherDashboard() {
  return (
    <TeacherLayout>
      <div className="page-title">Teacher Dashboard</div>
      <p style={{ color: '#64748b' }}>Your schedule and upcoming classes will appear here.</p>
    </TeacherLayout>
  );
}