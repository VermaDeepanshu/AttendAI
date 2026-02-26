import React, { useEffect, useState, useRef } from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import {
  getAttendanceFilters, getStudentsForAttendance,
  uploadAttendanceVideo, saveAttendance
} from '../../services/api';
import '../../styles/teacher.css';
import '../../styles/tables.css';

export default function TeacherAttendance() {
  const [filters, setFilters] = useState({ subjects: [], classes: [], days: [] });
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showStudents, setShowStudents] = useState(false);

  const [videoFile, setVideoFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fileRef = useRef(null);

  useEffect(() => {
    getAttendanceFilters()
      .then(res => setFilters(res.data))
      .catch(() => { });
  }, []);

  async function handleApply() {
    if (!selectedSubject) return;
    setSaveMsg('');
    setAiResult(null);
    try {
      const res = await getStudentsForAttendance(selectedSubject, selectedClass || undefined);
      setStudents(res.data);
      const initial = {};
      res.data.forEach(s => { initial[s.id] = { status: 'Not Marked', marked_by_ai: false }; });
      setAttendance(initial);
      setShowStudents(true);
    } catch { }
  }

  function handleStatusChange(studentId, status) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status, marked_by_ai: false }
    }));
  }

  async function handleVideoUpload() {
    if (!videoFile || !selectedSubject) return;
    setProcessing(true);
    setAiResult(null);
    try {
      const fd = new FormData();
      fd.append('file', videoFile);
      fd.append('subject_id', selectedSubject);
      if (selectedClass) fd.append('class_id', selectedClass);
      const res = await uploadAttendanceVideo(fd);
      setAiResult(res.data);

      // Update attendance based on AI results
      const updated = { ...attendance };
      res.data.results.forEach(r => {
        updated[r.student_id] = {
          status: r.status,
          marked_by_ai: r.marked_by_ai
        };
      });
      setAttendance(updated);
    } catch (err) {
      setAiResult({ error: err.response?.data?.detail || 'Video processing failed' });
    } finally {
      setProcessing(false);
    }
  }

  async function handleSave() {
    if (!selectedSubject) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const records = Object.entries(attendance).map(([studentId, data]) => ({
        student_id: parseInt(studentId),
        status: data.status,
        marked_by_ai: data.marked_by_ai || false
      }));

      await saveAttendance({
        subject_id: parseInt(selectedSubject),
        class_id: selectedClass ? parseInt(selectedClass) : null,
        date: selectedDate,
        time_start: selectedTime || null,
        records
      });
      setSaveMsg('✅ Attendance saved successfully!');
    } catch (err) {
      setSaveMsg('❌ ' + (err.response?.data?.detail || 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  function getStatusClass(status) {
    if (status === 'Present') return 'present';
    if (status === 'Absent') return 'absent';
    return 'not-marked';
  }

  const presentCount = Object.values(attendance).filter(a => a.status === 'Present').length;
  const absentCount = Object.values(attendance).filter(a => a.status === 'Absent').length;

  return (
    <TeacherLayout>
      <div className="page-title">Mark Attendance</div>
      <p className="section-sub">Select filters and mark attendance manually or via AI video</p>

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filter-group">
          <label>Subject</label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">Select Subject</option>
            {filters.subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">All Classes</option>
            {filters.classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Date</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Time</label>
          <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleApply} style={{ alignSelf: 'flex-end' }}>
          Apply
        </button>
      </div>

      {showStudents && (
        <>
          {/* Video Upload */}
          <div
            className={`video-upload-area ${videoFile ? 'active' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            <div className="upload-icon">🎥</div>
            <div className="upload-text">
              {videoFile ? videoFile.name : 'Click to upload classroom video for AI attendance'}
            </div>
            <div className="upload-hint">Supported: .mp4, .avi, .mkv, .mov</div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={e => setVideoFile(e.target.files[0])}
            />
          </div>

          {videoFile && (
            <div style={{ marginBottom: '20px' }}>
              <button
                className="btn-primary"
                onClick={handleVideoUpload}
                disabled={processing}
              >
                {processing ? '🔄 Processing Video...' : '🤖 Run AI Attendance'}
              </button>
            </div>
          )}

          {/* AI Result Banner */}
          {aiResult && !aiResult.error && (
            <div className="ai-result-banner">
              <div className="arb-icon">🤖</div>
              <div className="arb-text">AI detected {aiResult.detected_count} out of {aiResult.total_students} students</div>
              <div className="arb-detail">You can manually override below</div>
            </div>
          )}
          {aiResult?.error && (
            <div className="upload-result error" style={{ marginBottom: '20px' }}>
              ❌ {aiResult.error}
            </div>
          )}

          {/* Summary */}
          <div className="records-summary">
            <span className="rs-chip total">Total: {students.length}</span>
            <span className="rs-chip present">Present: {presentCount}</span>
            <span className="rs-chip absent">Absent: {absentCount}</span>
          </div>

          {/* Student List */}
          <div className="data-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.roll_number}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.class_name} {s.section || ''}</td>
                    <td>
                      <select
                        className={`status-select ${getStatusClass(attendance[s.id]?.status)}`}
                        value={attendance[s.id]?.status || 'Not Marked'}
                        onChange={e => handleStatusChange(s.id, e.target.value)}
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

          {/* Save */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Attendance'}
            </button>
            {saveMsg && (
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: saveMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                {saveMsg}
              </span>
            )}
          </div>
        </>
      )}

      {!showStudents && (
        <div className="empty-state">
          <div className="es-icon">📋</div>
          <div className="es-text">Select a subject and click Apply to load students</div>
        </div>
      )}
    </TeacherLayout>
  );
}