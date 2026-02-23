import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing.css';

const features = [
  { icon: '🤖', title: 'AI-Powered', desc: 'Face recognition via uploaded classroom videos — no manual roll calls.' },
  { icon: '🔒', title: 'Secure', desc: 'JWT auth, bcrypt hashing, role-based access control.' },
  { icon: '⚡', title: 'Fast', desc: 'Automated attendance in seconds, saving valuable class time.' },
  { icon: '📊', title: 'Analytics', desc: 'Real-time attendance trends, reports, and <75% alerts.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-wrapper">
      <nav className="landing-nav">
        <div className="nav-brand">Attend<span>AI</span></div>
        <button className="btn-primary" onClick={() => navigate('/select-role')}>
          Get Started
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">AI-Powered Attendance</span>
          <h1>Eliminate Proxy Attendance <br/><span>Forever</span></h1>
          <p>
            AttendAI uses face recognition to automatically mark attendance 
            from classroom videos — saving time, ensuring accuracy, and 
            making proxy impossible.
          </p>
          <button className="hero-cta" onClick={() => navigate('/select-role')}>
            Get Started →
          </button>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="hc-header">📹 Processing Video...</div>
            <div className="hc-faces">
              {['👤','👤','👤','👤','👤','👤'].map((f,i)=>(
                <span key={i} className={`face-chip ${i<4?'detected':''}`}>{f}</span>
              ))}
            </div>
            <div className="hc-result">✅ 4 students marked Present</div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why AttendAI?</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="fc-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2024 AttendAI — Built for smarter classrooms</p>
      </footer>
    </div>
  );
}