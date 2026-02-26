import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getDashboardStats } from '../../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import '../../styles/admin.css';
import '../../styles/dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_subjects: 0,
    total_classes: 0,
    attendance_trend: []
  });

  useEffect(() => {
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(() => { });
  }, []);

  const cards = [
    { label: 'Total Students', value: stats.total_students, icon: '👥', color: '#4f46e5' },
    { label: 'Total Teachers', value: stats.total_teachers, icon: '👩‍🏫', color: '#06b6d4' },
    { label: 'Total Subjects', value: stats.total_subjects, icon: '📚', color: '#10b981' },
    { label: 'Total Classes', value: stats.total_classes, icon: '🏫', color: '#f59e0b' },
  ];

  const chartData = {
    labels: (stats.attendance_trend || []).map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Students Present',
      data: (stats.attendance_trend || []).map(t => t.present),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#4f46e5',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        cornerRadius: 8,
        padding: 12,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#94a3b8', font: { size: 12 } },
        grid: { color: '#f1f5f9' }
      },
      x: {
        ticks: { color: '#94a3b8', font: { size: 12 } },
        grid: { display: false }
      }
    }
  };

  return (
    <AdminLayout>
      <div className="page-title">Dashboard</div>
      <p className="welcome-text">Welcome back, Admin</p>

      <div className="stats-grid">
        {cards.map((c, i) => (
          <div className="stat-card" key={i} style={{ borderLeftColor: c.color }}>
            <div className="stat-icon">{c.icon}</div>
            <div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-chart-wrap">
        <h3>Attendance Trend (Last 7 Days)</h3>
        <div className="dashboard-chart">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </AdminLayout>
  );
}