import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { changeAdminCredentials } from '../../services/api';
import '../../styles/forms.css';

export default function AdminCredentials() {
  const [form, setForm] = useState({ old_password: '', new_username: '', new_password: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await changeAdminCredentials(form);
      // Update token if returned
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }
      setMsg('✅ Credentials updated successfully');
      setForm({ old_password: '', new_username: '', new_password: '' });
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.detail || 'Failed. Check your old password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="page-title">Change Credentials</div>
      <p className="section-sub">Update your admin username and password</p>

      <div className="form-card">
        {msg && (
          <div className={`upload-result ${msg.startsWith('✅') ? 'success' : 'error'}`}
            style={{ marginBottom: '20px' }}>
            {msg}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input className="form-input" type="password" required
              value={form.old_password}
              onChange={e => setForm({ ...form, old_password: e.target.value })} />
          </div>
          <div className="form-group">
            <label>New Username</label>
            <input className="form-input" type="text" placeholder="Leave blank to keep current"
              value={form.new_username}
              onChange={e => setForm({ ...form, new_username: e.target.value })} />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input className="form-input" type="password" placeholder="Leave blank to keep current"
              value={form.new_password}
              onChange={e => setForm({ ...form, new_password: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Credentials'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}