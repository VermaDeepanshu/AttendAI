import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { login } from '../../services/api';
import '../../styles/auth.css';

export default function LoginPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('role', res.data.role);
      if (res.data.role === 'admin') navigate('/admin/dashboard');
      else navigate('/teacher/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{role === 'admin' ? '🛡️ Admin Login' : '👩‍🏫 Teacher Login'}</h2>
        <p>Enter your credentials to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => navigate('/select-role')}
          style={{ marginTop: '16px', background: 'none', color: '#64748b', fontSize: '0.85rem', width: '100%' }}
        >
          ← Back to role selection
        </button>
      </div>
    </div>
  );
}