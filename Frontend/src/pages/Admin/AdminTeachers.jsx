import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getTeachers, addTeacher, deleteTeacher } from '../../services/api';
import '../../styles/admin.css';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [newCreds, setNewCreds] = useState(null);

  useEffect(() => { fetchTeachers(); }, []);

  async function fetchTeachers() {
    try {
      const res = await getTeachers();
      setTeachers(res.data);
    } catch {}
  }

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      const res = await addTeacher(name);
      setNewCreds(res.data);
      setName('');
      fetchTeachers();
    } catch {}
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this teacher?')) return;
    try {
      await deleteTeacher(id);
      fetchTeachers();
    } catch {}
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-title">Teachers</div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Teacher</button>
      </div>

      <div className="teachers-grid">
        {teachers.map(t => (
          <div className="teacher-card" key={t.id}>
            <div className="teacher-avatar">👤</div>
            <div className="teacher-name">{t.name}</div>
            <div className="teacher-username">{t.username}</div>
            <div className="teacher-actions">
              <button className="btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
              <button className="btn-secondary">Upload Schedule</button>
            </div>
          </div>
        ))}
        {teachers.length === 0 && (
          <p style={{ color: '#64748b' }}>No teachers added yet.</p>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setNewCreds(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Teacher</h3>
            {newCreds ? (
              <>
                <p style={{ color: '#10b981', marginBottom: '16px' }}>✅ Teacher added! Save these credentials:</p>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p><strong>Username:</strong> {newCreds.username}</p>
                  <p><strong>Password:</strong> {newCreds.password}</p>
                </div>
                <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠️ Password shown only once. Save it now.</p>
                <div className="modal-actions">
                  <button className="btn-primary" onClick={() => { setShowModal(false); setNewCreds(null); }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <input
                  className="form-input"
                  placeholder="Teacher full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleAdd}>Add Teacher</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}