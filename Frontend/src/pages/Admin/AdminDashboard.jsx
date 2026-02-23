import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getDashboardStats } from '../../services/api';
import '../../styles/admin.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_subjects: 0,
    total_classes: 0
  });

  useEffect(() => {
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Students', value: stats.total_students, icon: '👥', color: '#4f46e5' },
    { label: 'Total Teachers', value: stats.total_teachers, icon: '👩‍🏫', color: '#06b6d4' },
    { label: 'Total Subjects', value: stats.total_subjects, icon: '📚', color: '#10b981' },
    { label: 'Total Classes',  value: stats.total_classes,  icon: '🏫', color: '#f59e0b' },
  ];

  return (
    <AdminLayout>
      <div className="page-title">Dashboard</div>
      <p style={{ color: '#64748b', marginBottom: '28px' }}>Welcome back, Admin</p>

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
    </AdminLayout>
  );
}