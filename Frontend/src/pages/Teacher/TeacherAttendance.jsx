import React from 'react';
import TeacherLayout from '../../components/TeacherLayout';

export default function TeacherAttendance() {
  return (
    <TeacherLayout>
      <div className="page-title">Mark Attendance</div>
      <p style={{ color: '#64748b' }}>Upload video or mark manually.</p>
    </TeacherLayout>
  );
}