import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import { getAnalytics } from '../../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import '../../styles/teacher.css';
import '../../styles/tables.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function TeacherAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <TeacherLayout>
        <div className="loading-spinner"><div className="spinner"></div> Loading analytics...</div>
      </TeacherLayout>
    );
  }

  if (!data) {
    return (
      <TeacherLayout>
        <div className="page-title">Analytics</div>
        <div className="empty-state">
          <div className="es-icon">📊</div>
          <div className="es-text">No data available</div>
          <div className="es-hint">Mark attendance to see analytics</div>
        </div>
      </TeacherLayout>
    );
  }

  const subjectNames = (data.subject_analytics || []).map(s => s.subject);
  const subjectPercentages = (data.subject_analytics || []).map(s => s.attendance_percentage);
  const subjectLectures = (data.subject_analytics || []).map(s => s.total_lectures);

  const barColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const barData = {
    labels: subjectNames,
    datasets: [{
      label: 'Attendance %',
      data: subjectPercentages,
      backgroundColor: subjectNames.map((_, i) => barColors[i % barColors.length]),
      borderRadius: 8,
      barPercentage: 0.6,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e293b', cornerRadius: 8, padding: 12 }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: v => v + '%', color: '#94a3b8', font: { size: 12 } },
        grid: { color: '#f1f5f9' }
      },
      x: {
        ticks: { color: '#94a3b8', font: { size: 12 } },
        grid: { display: false }
      }
    }
  };

  const doughnutData = {
    labels: subjectNames,
    datasets: [{
      data: subjectLectures,
      backgroundColor: subjectNames.map((_, i) => barColors[i % barColors.length]),
      borderWidth: 0,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
      tooltip: { backgroundColor: '#1e293b', cornerRadius: 8, padding: 12 }
    }
  };

  return (
    <TeacherLayout>
      <div className="page-title">Analytics</div>
      <p className="section-sub">Attendance analytics and insights</p>

      {/* Overview Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="ic-value">{data.total_lectures}</div>
          <div className="ic-label">Total Lectures</div>
        </div>
        <div className="info-card">
          <div className="ic-value">{(data.subject_analytics || []).length}</div>
          <div className="ic-label">Subjects</div>
        </div>
        <div className="info-card">
          <div className="ic-value" style={{ color: '#ef4444' }}>
            {(data.low_attendance_students || []).length}
          </div>
          <div className="ic-label">Students &lt;75%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>📊 Subject-wise Attendance %</h3>
          <div className="chart-container">
            {subjectNames.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div className="empty-state">
                <div className="es-text">No data yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3>📈 Lectures per Subject</h3>
          <div className="chart-container">
            {subjectNames.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="empty-state">
                <div className="es-text">No data yet</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Analytics Table */}
      {(data.subject_analytics || []).length > 0 && (
        <div className="analytics-card" style={{ marginBottom: '24px' }}>
          <h3>📋 Subject Analytics</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Total Lectures</th>
                  <th>Total Present</th>
                  <th>Total Records</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {data.subject_analytics.map((s, i) => (
                  <tr key={i}>
                    <td><strong>{s.subject}</strong></td>
                    <td>{s.total_lectures}</td>
                    <td><span className="badge badge-success">{s.total_present}</span></td>
                    <td>{s.total_records}</td>
                    <td>
                      <span className={`badge ${s.attendance_percentage >= 75 ? 'badge-success' : 'badge-danger'}`}>
                        {s.attendance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Attendance Students */}
      {(data.low_attendance_students || []).length > 0 && (
        <div className="analytics-card">
          <h3>⚠️ Students with &lt;75% Attendance</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Subject</th>
                  <th>Present</th>
                  <th>Total Lectures</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {data.low_attendance_students.map((s, i) => (
                  <tr key={i}>
                    <td><strong>{s.student_name}</strong></td>
                    <td>{s.roll_number}</td>
                    <td>{s.subject}</td>
                    <td>{s.present}</td>
                    <td>{s.total}</td>
                    <td><span className="low-attendance-badge">{s.attendance_percentage}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}