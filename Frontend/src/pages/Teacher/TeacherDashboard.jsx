import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import { getTeacherDashboard, getTeacherSchedule } from '../../services/api';
import '../../styles/teacher.css';
import '../../styles/dashboard.css';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTeacherDashboard().then(r => r.data).catch(() => null),
      getTeacherSchedule().then(r => r.data).catch(() => [])
    ]).then(([dashboard, sched]) => {
      setData(dashboard);
      setSchedule(sched);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <TeacherLayout>
        <div className="loading-spinner"><div className="spinner"></div> Loading dashboard...</div>
      </TeacherLayout>
    );
  }

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedSchedule = [...schedule].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  );

  return (
    <TeacherLayout>
      <div className="page-title">Dashboard</div>
      <p className="section-sub">Welcome back, {data?.name || 'Teacher'}</p>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="ic-value">{data?.subjects?.length || 0}</div>
          <div className="ic-label">Assigned Subjects</div>
        </div>
        <div className="info-card">
          <div className="ic-value">{data?.classes?.length || 0}</div>
          <div className="ic-label">Classes Handled</div>
        </div>
        <div className="info-card">
          <div className="ic-value">{data?.total_lectures || 0}</div>
          <div className="ic-label">Lectures Taken</div>
        </div>
        <div className="info-card">
          <div className="ic-value">{data?.total_schedule_entries || 0}</div>
          <div className="ic-label">Schedule Entries</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Lectures */}
        <div className="schedule-widget">
          <h3>📅 Today's Lectures</h3>
          {data?.today_schedule && data.today_schedule.length > 0 ? (
            data.today_schedule.map((l, i) => (
              <div className="sw-item" key={i}>
                <div className="sw-dot"></div>
                <div className="sw-info">
                  <div className="sw-subj">{l.subject}</div>
                  <div className="sw-class">{l.class_name}</div>
                </div>
                <div className="sw-time">
                  {l.time_start ? `${l.time_start}${l.time_end ? ' - ' + l.time_end : ''}` : '—'}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="es-icon">🎉</div>
              <div className="es-text">No lectures today</div>
            </div>
          )}
        </div>

        {/* Weekly Timetable */}
        <div className="schedule-widget">
          <h3>📋 Weekly Timetable</h3>
          {sortedSchedule.length > 0 ? (
            <div className="schedule-table-wrap" style={{ maxHeight: '350px', overflow: 'auto' }}>
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSchedule.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.day}</strong></td>
                      <td>{s.time_start ? `${s.time_start}${s.time_end ? ' - ' + s.time_end : ''}` : '—'}</td>
                      <td>{s.subject}</td>
                      <td>{s.class_name} {s.section || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="es-icon">📋</div>
              <div className="es-text">No schedule assigned yet</div>
              <div className="es-hint">Contact admin to upload your schedule</div>
            </div>
          )}
        </div>
      </div>

      {/* Subjects & Classes */}
      {data?.subjects && data.subjects.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Assigned Subjects</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.subjects.map((s, i) => (
              <span key={i} className="badge badge-success">{s}</span>
            ))}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}