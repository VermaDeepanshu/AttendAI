import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/admin.css';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/teachers', label: 'Teachers', icon: '👩‍🏫' },
  { path: '/admin/students', label: 'Students', icon: '👥' },
  { path: '/admin/credentials', label: 'Credentials', icon: '🔐' },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function logout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div className={`admin-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>Attend<em>AI</em></span>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>☰</button>
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
          <h2 className="top-bar-title">Admin Panel</h2>
          <div className="top-bar-right">
            <span className="admin-chip">🛡️ Admin</span>
          </div>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}