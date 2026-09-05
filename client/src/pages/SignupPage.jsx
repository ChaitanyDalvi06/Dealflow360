import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [teamSize, setTeamSize] = useState('16-50');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password strength logic
  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);
  const getStrengthMeta = () => {
    if (!password) return { color: '#DC2626', text: 'Password strength: Enter password' };
    if (strength <= 25) return { color: '#DC2626', text: 'Password strength: Weak' };
    if (strength <= 50) return { color: '#FBBF24', text: 'Password strength: Moderate' };
    if (strength <= 75) return { color: '#38BDF8', text: 'Password strength: Good' };
    return { color: '#16A34A', text: 'Password strength: Strong & Enterprise Ready' };
  };

  const handleAdminSignup = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please accept the Master Services Agreement.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup({
        name: fullName,
        email,
        password,
        role: 'ADMIN',
      });
      setSuccessModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchWorkspace = () => {
    navigate('/dashboard');
  };

  const strengthMeta = getStrengthMeta();

  return (
    <div className="signup-page-root">
      {/* Top Navigation */}
      <header className="signup-nav">
        <Link to="/" className="logo">
          DealFlow360<span className="logo-dot"></span>
        </Link>
        <Link to="/login" className="nav-back-link">
          <span>&larr;</span> Back to Login
        </Link>
      </header>

      {/* Main Split Layout */}
      <main className="signup-wrapper">
        {/* LEFT HERO / AMBIENT PANEL */}
        <section className="hero-panel">
          <div>
            <div className="pill">
              <span className="pulse-dot"></span>
              <span>Self-Governing Engine v1.0</span>
            </div>

            <h1>
              Take total control of your <br />
              <span className="editorial">sales operations.</span>
            </h1>

            <p className="lead" style={{ marginBottom: '2rem' }}>
              Self-governing discount tiers, automated warehouse routing, and predictive deal intelligence.
            </p>

            {/* Highlights */}
            <div className="admin-features-list" style={{ gap: '1.1rem', marginBottom: '2rem' }}>
              <div className="feature-row">
                <div className="feature-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Automated Pricing Discipline</strong>
                  <span>Enforces category ceilings and multi-tiered approval chains.</span>
                </div>
              </div>

              <div className="feature-row">
                <div className="feature-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Smart Stock Splitting</strong>
                  <span>Real-time multi-depot stock routing with zero manual work.</span>
                </div>
              </div>

              <div className="feature-row">
                <div className="feature-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Predictive Win Telemetry</strong>
                  <span>ML-backed customer negotiation acceptance rates.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT FORM PANEL */}
        <section className="form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Create Admin Account</h2>
              <p>Initialize your company workspace in seconds.</p>
            </div>

            {error && (
              <div className="login-error-alert" style={{ marginBottom: '1.2rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleAdminSignup}>
              <div className="form-grid">
                <div className="input-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="adminFullName">Full Name</label>
                    <input
                      type="text"
                      id="adminFullName"
                      className="form-input"
                      placeholder="e.g. Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="adminEmail">Work Email</label>
                    <input
                      type="email"
                      id="adminEmail"
                      className="form-input"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyName">Company Name</label>
                    <input
                      type="text"
                      id="companyName"
                      className="form-input"
                      placeholder="Acme Technologies"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="teamSize">Sales Org Size</label>
                    <select
                      id="teamSize"
                      className="form-select"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      required
                    >
                      <option value="1-15">1 – 15 Sales Reps</option>
                      <option value="16-50">16 – 50 Sales Reps</option>
                      <option value="51-200">51 – 200 Sales Reps</option>
                      <option value="200+">200+ Enterprise Reps</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adminPassword">Master Admin Password</label>
                  <div className="password-wrapper">
                    <input
                      type="password"
                      id="adminPassword"
                      className="form-input"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{ width: `${strength}%`, backgroundColor: strengthMeta.color }}
                    ></div>
                  </div>
                  <div className="strength-label">
                    <span>{strengthMeta.text}</span>
                    <span>Requires 8+ chars</span>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    className="custom-checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                  />
                  <label className="checkbox-label" htmlFor="agreeTerms">
                    I agree to the Master Services Agreement and Privacy Policy.
                  </label>
                </div>

                <button type="submit" className="btn-submit" disabled={loading}>
                  <span>{loading ? 'Provisioning Workspace...' : 'Create Admin Account'}</span>
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  )}
                </button>
              </div>
            </form>

            <div className="form-footer-note">
              Already an authorized workspace user? <Link to="/login">Log in to portal</Link>
            </div>
          </div>
        </section>
      </main>

      {/* SUCCESS MODAL */}
      {successModal && (
        <div className="modal-overlay active">
          <div className="modal-box">
            <div className="modal-icon-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2>Admin Workspace Initialized!</h2>
            <p style={{ marginTop: '0.6rem', fontSize: '0.95rem', color: 'var(--navy-muted)' }}>
              Your DealFlow360 self-governing sales backend is active with pre-configured tier limits, warehouse routing, and audit logs.
            </p>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-tan)',
                borderRadius: '8px',
                padding: '1rem',
                margin: '1.5rem 0',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--navy-muted)' }}>Admin Email:</span>
                <strong style={{ color: 'var(--navy-deep)' }}>{email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--navy-muted)' }}>Organization:</span>
                <strong style={{ color: 'var(--navy-deep)' }}>{companyName || 'Enterprise Workspace'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--navy-muted)' }}>Governance Mode:</span>
                <strong style={{ color: '#16A34A' }}>Self-Governing Engine Active</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn-submit"
              onClick={handleLaunchWorkspace}
              style={{ textDecoration: 'none', marginTop: '0.5rem', width: '100%' }}
            >
              Launch Sales Workspace &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
