import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import {
  getTeachers, addTeacher, editTeacher, deleteTeacher,
  uploadSchedule, getTeacherScheduleAdmin
} from '../../services/api';
import '../../styles/admin.css';
import '../../styles/forms.css';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [newCreds, setNewCreds] = useState(null);

  // Schedule modal
  const [scheduleModal, setScheduleModal] = useState(null); // teacher id
  const [scheduleFile, setScheduleFile] = useState(null);
  const [scheduleUploading, setScheduleUploading] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');

  // View schedule modal
  const [viewSchedule, setViewSchedule] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);

  // Edit modal
  const [editModal, setEditModal] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchTeachers(); }, []);

  async function fetchTeachers() {
    try {
      const res = await getTeachers();
      setTeachers(res.data);
    } catch { }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      const res = await addTeacher(name);
      setNewCreds(res.data);
      setName('');
      fetchTeachers();
    } catch { }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this teacher?')) return;
    try {
      await deleteTeacher(id);
      fetchTeachers();
    } catch { }
  }

  async function handleEditSave() {
    if (!editName.trim()) return;
    try {
      await editTeacher(editModal, editName);
      setEditModal(null);
      fetchTeachers();
    } catch { }
  }

  async function handleScheduleUpload() {
    if (!scheduleFile) return;
    setScheduleUploading(true);
    setScheduleMsg('');
    try {
      const fd = new FormData();
      fd.append('file', scheduleFile);
      await uploadSchedule(scheduleModal, fd);
      setScheduleMsg('✅ Schedule uploaded successfully');
      setScheduleFile(null);
      fetchTeachers();
    } catch (err) {
      setScheduleMsg('❌ ' + (err.response?.data?.detail || 'Upload failed'));
    } finally {
      setScheduleUploading(false);
    }
  }

  async function handleViewSchedule(teacherId) {
    try {
      const res = await getTeacherScheduleAdmin(teacherId);
      setScheduleData(res.data);
      setViewSchedule(teacherId);
    } catch { }
  }

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <AdminLayout>
      <div className="page-header-row">
        <div>
          <div className="page-title">Teachers</div>
          <p className="section-sub">Manage teachers and their schedules</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Teacher</button>
      </div>

      <div className="teachers-grid">
        {teachers.map(t => (
          <div className="teacher-card" key={t.id}>
            <div className="teacher-avatar">👤</div>
            <div className="teacher-name">{t.name}</div>
            <div className="teacher-username">{t.username}</div>
            <div className="teacher-password">🔑 {t.password}</div>
            {t.subjects && t.subjects.length > 0 && (
              <div className="teacher-tags">
                {t.subjects.map((s, i) => (
                  <span key={i} className="badge badge-success">{s}</span>
                ))}
              </div>
            )}
            {t.classes && t.classes.length > 0 && (
              <div className="teacher-tags">
                {t.classes.map((c, i) => (
                  <span key={i} className="badge badge-warning">{c}</span>
                ))}
              </div>
            )}
            <div className="teacher-actions">
              <button className="btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
              <button className="btn-secondary" onClick={() => { setEditModal(t.id); setEditName(t.name); }}>Edit</button>
              <button className="btn-secondary" onClick={() => { setScheduleModal(t.id); setScheduleMsg(''); setScheduleFile(null); }}>
                {t.has_schedule ? 'Update Schedule' : 'Upload Schedule'}
              </button>
              {t.has_schedule && (
                <button className="btn-secondary" onClick={() => handleViewSchedule(t.id)}>View Schedule</button>
              )}
            </div>
          </div>
        ))}
        {teachers.length === 0 && (
          <div className="empty-state">
            <div className="es-icon">👩‍🏫</div>
            <div className="es-text">No teachers added yet</div>
            <div className="es-hint">Click "Add Teacher" to get started</div>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setNewCreds(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Teacher</h3>
            {newCreds ? (
              <>
                <p className="upload-result success">✅ Teacher added! Save these credentials:</p>
                <div className="creds-display">
                  <p><strong>Username:</strong> {newCreds.username}</p>
                  <p><strong>Password:</strong> {newCreds.password}</p>
                </div>
                <p className="creds-warning">⚠️ Password shown only once. Save it now.</p>
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

      {/* Edit Teacher Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Teacher</h3>
            <input
              className="form-input"
              placeholder="Teacher name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Schedule Modal */}
      {scheduleModal && (
        <div className="modal-overlay" onClick={() => setScheduleModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Upload Schedule</h3>
            <p className="section-sub">Upload an Excel (.xlsx) or CSV file with columns: day, time, subject, class</p>
            <div
              className={`file-upload-zone ${scheduleFile ? 'has-file' : ''}`}
              onClick={() => document.getElementById('schedule-file').click()}
            >
              <div className="fuz-icon">{scheduleFile ? '✅' : '📄'}</div>
              <div className="fuz-text">{scheduleFile ? scheduleFile.name : 'Click to select file'}</div>
              <div className="fuz-hint">Supported: .xlsx, .csv, .pdf</div>
              <input
                id="schedule-file"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={e => setScheduleFile(e.target.files[0])}
              />
            </div>
            {scheduleMsg && (
              <div className={`upload-result ${scheduleMsg.startsWith('✅') ? 'success' : 'error'}`}>
                {scheduleMsg}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setScheduleModal(null)}>Close</button>
              <button className="btn-primary" onClick={handleScheduleUpload} disabled={!scheduleFile || scheduleUploading}>
                {scheduleUploading ? 'Uploading...' : 'Upload Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Schedule Modal */}
      {viewSchedule && (
        <div className="modal-overlay" onClick={() => setViewSchedule(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: '600px' }}>
            <h3>Teacher Schedule</h3>
            {scheduleData.length > 0 ? (
              <div className="schedule-table-wrap" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...scheduleData]
                      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
                      .map((s, i) => (
                        <tr key={i}>
                          <td>{s.day}</td>
                          <td>{s.time_start ? `${s.time_start}${s.time_end ? ' - ' + s.time_end : ''}` : '—'}</td>
                          <td>{s.subject}</td>
                          <td>{s.class_name} {s.section || ''}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="section-sub">No schedule entries found.</p>
            )}
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setViewSchedule(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}