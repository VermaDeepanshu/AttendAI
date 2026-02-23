import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { changeAdminCredentials } from '../../services/api';

export default function AdminCredentials() {
  const [form, setForm] = useState({ old_password: '', new_username: '', new_password: '' });
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await changeAdminCredentials(form);
      setMsg('✅ Credentials updated successfully');
    } catch {
      setMsg('❌ Failed. Check your old password.');
    }
  }

  return (
    <AdminLayout>
      <div className="page-title">Change Credentials</div>
      <p style={{ color: '#64748b', marginBottom: '28px' }}>Update your admin username and password</p>

      <div className="card" style={{ maxWidth: '480px' }}>
        {msg && <p style={{ marginBottom: '16px', color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input className="form-input" type="password" required
              onChange={e => setForm({ ...form, old_password: e.target.value })} />
          </div>
          <div className="form-group">
            <label>New Username</label>
            <input className="form-input" type="text"
              onChange={e => setForm({ ...form, new_username: e.target.value })} />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input className="form-input" type="password"
              onChange={e => setForm({ ...form, new_password: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit">Update Credentials</button>
        </form>
      </div>
    </AdminLayout>
  );
}