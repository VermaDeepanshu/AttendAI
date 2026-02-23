import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/auth.css';

export default function RoleSelect() {
  const navigate = useNavigate();
  return (
    <div className="auth-wrapper">
      <div className="role-select-card">
        <h2>Choose Your Role</h2>
        <p>Select how you want to log in</p>
        <div className="role-options">
          <button className="role-btn" onClick={() => navigate('/login/admin')}>
            <span>🛡️</span>
            <strong>Admin</strong>
            <small>Manage teachers & students</small>
          </button>
          <button className="role-btn" onClick={() => navigate('/login/teacher')}>
            <span>👩‍🏫</span>
            <strong>Teacher</strong>
            <small>Mark & view attendance</small>
          </button>
        </div>
      </div>
    </div>
  );
}