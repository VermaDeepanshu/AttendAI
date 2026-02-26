import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import '../styles/teacher.css';

const navItems = [
  { path: '/teacher/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/teacher/attendance', label: 'Attendance', icon: '✅' },
  { path: '/teacher/records', label: 'Records', icon: '📋' },
  { path: '/teacher/analytics', label: 'Analytics', icon: '📈' },
];

export default function TeacherLayout({ children }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>Attend<em>AI</em></span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>🚪 Logout</button>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <h2 className="top-bar-title">Teacher Panel</h2>
          <span className="teacher-chip">👩‍🏫 Teacher</span>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
