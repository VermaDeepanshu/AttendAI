import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import {
  getAttendanceRecords, getAttendanceFilters, editAttendanceRecord
} from '../../services/api';
import '../../styles/teacher.css';
import '../../styles/tables.css';

export default function TeacherRecords() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ subjects: [], classes: [] });
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState(null);
  const [editRecords, setEditRecords] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  useEffect(() => {
    getAttendanceFilters()
      .then(res => setFilters(res.data))
      .catch(() => { });
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    try {
      const params = {};
      if (filterSubject) params.subject_id = filterSubject;
      if (filterClass) params.class_id = filterClass;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await getAttendanceRecords(params);
      setRecords(res.data);
    } catch { }
    setLoading(false);
  }

  function handleFilter() {
    fetchRecords();
  }

  function openEdit(record) {
    setEditModal(record);
    setEditRecords(record.records.map(r => ({ ...r })));
    setEditMsg('');
  }

  function handleEditStatus(index, status) {
    setEditRecords(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  }

  async function handleEditSave() {
    setEditSaving(true);
    setEditMsg('');
    try {
      await editAttendanceRecord(editModal.id, {
        records: editRecords.map(r => ({
          student_id: r.student_id,
          status: r.status
        }))
      });
      setEditMsg('✅ Updated successfully');
      fetchRecords();
      setTimeout(() => setEditModal(null), 1000);
    } catch (err) {
      setEditMsg('❌ ' + (err.response?.data?.detail || 'Update failed'));
    } finally {
      setEditSaving(false);
    }
  }

  function getStatusClass(status) {
    if (status === 'Present') return 'present';
    if (status === 'Absent') return 'absent';
    return 'not-marked';
  }

  return (
    <TeacherLayout>
      <div className="page-title">Attendance Records</div>
      <p className="section-sub">View and edit past attendance records</p>

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filter-group">
          <label>Subject</label>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {filters.subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Class</label>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {filters.classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>From</label>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>To</label>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleFilter} style={{ alignSelf: 'flex-end' }}>
          Filter
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div> Loading records...</div>
      ) : records.length > 0 ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Present</th>
                <th>Total</th>
                <th>%</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.date}</strong></td>
                  <td>{r.time_start || '—'}</td>
                  <td>{r.subject}</td>
                  <td>{r.class_name}</td>
                  <td><span className="badge badge-success">{r.present}</span></td>
                  <td>{r.total}</td>
                  <td>
                    <span className={`badge ${r.total > 0 && (r.present / r.total * 100) >= 75 ? 'badge-success' : 'badge-danger'}`}>
                      {r.total > 0 ? Math.round(r.present / r.total * 100) : 0}%
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-sm edit" onClick={() => openEdit(r)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="es-icon">📋</div>
          <div className="es-text">No attendance records found</div>
          <div className="es-hint">Mark attendance first to see records here</div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: '550px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Edit Attendance — {editModal.date}</h3>
            <p className="section-sub">{editModal.subject} | {editModal.class_name}</p>

            <div className="data-table-wrap" style={{ marginTop: '16px' }}>
              <table className="att-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {editRecords.map((r, i) => (
                    <tr key={r.student_id}>
                      <td>{r.roll_number}</td>
                      <td>{r.student_name}</td>
                      <td>
                        <select
                          className={`status-select ${getStatusClass(r.status)}`}
                          value={r.status}
                          onChange={e => handleEditStatus(i, e.target.value)}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Not Marked">Not Marked</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editMsg && (
              <div className={`upload-result ${editMsg.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
                {editMsg}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}