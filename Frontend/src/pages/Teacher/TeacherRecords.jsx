import React from 'react';
import TeacherLayout from '../../components/TeacherLayout';

export default function TeacherRecords() {
  return (
    <TeacherLayout>
      <div className="page-title">Attendance Records</div>
      <p style={{ color: '#64748b' }}>Past attendance records will appear here.</p>
    </TeacherLayout>
  );
}