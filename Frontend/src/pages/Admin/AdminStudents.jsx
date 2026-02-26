import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { uploadStudents, getStudents, getSubjects } from '../../services/api';
import '../../styles/admin.css';
import '../../styles/forms.css';
import '../../styles/tables.css';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch] = useState('');

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  async function fetchStudents(subjectId) {
    try {
      const res = await getStudents(subjectId || undefined);
      setStudents(res.data);
    } catch { }
  }

  async function fetchSubjects() {
    try {
      const res = await getSubjects();
      setSubjects(res.data);
    } catch { }
  }

  function handleFilterChange(val) {
    setFilterSubject(val);
    fetchStudents(val || undefined);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadStudents(fd);
      setUploadResult({ success: true, data: res.data });
      setFile(null);
      fetchStudents();
      fetchSubjects();
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.response?.data?.detail || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  }

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="page-title">Students</div>
      <p className="section-sub">Upload and manage student data</p>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 700 }}>Upload Students</h3>
        <p className="section-sub" style={{ marginBottom: '16px' }}>
          Upload a ZIP file containing a <strong>students.csv</strong> (columns: name, roll_number, class, section, subjects)
          and an <strong>images/</strong> folder with photos named by roll number (e.g., STU001.jpg).
        </p>

        <div
          className={`file-upload-zone ${file ? 'has-file' : ''}`}
          onClick={() => document.getElementById('student-file').click()}
        >
          <div className="fuz-icon">{file ? '✅' : '📁'}</div>
          <div className="fuz-text">{file ? file.name : 'Click to select ZIP file'}</div>
          <div className="fuz-hint">Supported: .zip, .csv, .xlsx</div>
          {file && <div className="fuz-filename">{(file.size / 1024).toFixed(1)} KB</div>}
          <input
            id="student-file"
            type="file"
            accept=".zip,.csv,.xlsx,.xls"
            onChange={e => { setFile(e.target.files[0]); setUploadResult(null); }}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ marginTop: '8px' }}
        >
          {uploading ? 'Uploading & Processing...' : 'Upload Students'}
        </button>

        {uploadResult && (
          <div className={`upload-result ${uploadResult.success ? 'success' : 'error'}`}>
            {uploadResult.success
              ? `✅ ${uploadResult.data.message}`
              : `❌ ${uploadResult.message}`
            }
            {uploadResult.success && uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
              <div className="upload-errors">
                <strong>Warnings:</strong>
                {uploadResult.data.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterSubject} onChange={e => handleFilterChange(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span className="badge badge-success" style={{ padding: '8px 14px' }}>
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Students Grid */}
      {filtered.length > 0 ? (
        <div className="students-grid">
          {filtered.map(s => (
            <div className="student-card" key={s.id}>
              <div className="sc-avatar">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="sc-info">
                <div className="sc-name">{s.name}</div>
                <div className="sc-roll">{s.roll_number}</div>
                {(s.class_name || s.section) && (
                  <div className="sc-class">
                    {s.class_name} {s.section || ''}
                  </div>
                )}
                {s.subjects && s.subjects.length > 0 && (
                  <div className="sc-subjects">
                    {s.subjects.map((subj, i) => (
                      <span key={i} className="sc-subj-tag">{subj.name}</span>
                    ))}
                  </div>
                )}
                <div className="sc-encoding">
                  <span className={`encoding-badge ${s.has_encoding ? 'yes' : 'no'}`}>
                    {s.has_encoding ? '✅ Face Encoded' : '❌ No Encoding'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="es-icon">👥</div>
          <div className="es-text">No students found</div>
          <div className="es-hint">Upload student data using the form above</div>
        </div>
      )}
    </AdminLayout>
  );
}