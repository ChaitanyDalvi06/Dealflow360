import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const [currentMode, setCurrentMode] = useState('workspace'); // 'workspace' | 'customer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (currentMode === 'workspace') {
        await login(email, password);
        navigate('/dashboard');
      } else {
        // Customer Portal Authentication
        const res = await api.post('/auth/portal/login', { email, password });
        localStorage.setItem('df_portal_token', res.data.token);
        localStorage.setItem('df_portal_customer', JSON.stringify(res.data.customer));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass, mode = 'workspace') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setCurrentMode(mode);
    setError('');
    setLoading(true);

    try {
      if (mode === 'workspace') {
        await login(demoEmail, demoPass);
        navigate('/dashboard');
      } else {
        const res = await api.post('/auth/portal/login', { email: demoEmail, password: demoPass });
        localStorage.setItem('df_portal_token', res.data.token);
        localStorage.setItem('df_portal_customer', JSON.stringify(res.data.customer));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Quick login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* Top Simple Navigation */}
      <header className="login-nav">
        <Link to="/" className="logo">
          DealFlow360<span className="logo-dot"></span>
        </Link>
        <div className="nav-links-right">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/signup" className="nav-link" style={{ color: 'var(--navy-deep)', fontWeight: 700 }}>
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="login-wrapper">
        {/* LEFT HERO / BRAND PANEL */}
        <section className="hero-panel">
          <div>
            <h1>
              Welcome back to <br />
              <span className="editorial">DealFlow360.</span>
            </h1>

            <p className="lead">
              Access your real-time sales workspace, discount approval chains, and customer negotiation telemetry.
            </p>

            {/* Minimal 3-Point Highlights */}
            <div className="features-list">
              <div className="feature-row">
                <div className="feature-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Instant Deal Governance</strong>
                  <span>Review pending discount requests and blended risk scores.</span>
                </div>
              </div>

              <div className="feature-row">
                <div className="feature-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Real-Time Pipeline Telemetry</strong>
                  <span>Live event stream monitoring stalled quotes and deals.</span>
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
                  <strong>Negotiation Room</strong>
                  <span>Interactive customer counter-offers with ML acceptance prediction.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT FORM PANEL */}
        <section className="form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>{currentMode === 'workspace' ? 'Log in to portal' : 'Customer Negotiation Portal'}</h2>
              <p>
                {currentMode === 'workspace'
                  ? 'Enter your credentials to enter your workspace.'
                  : 'Access your live quotation and submit terms.'}
              </p>
            </div>

            {/* Role / Mode Toggle */}
            <div className="portal-tabs">
              <button
                type="button"
                className={`portal-tab-btn ${currentMode === 'workspace' ? 'active' : ''}`}
                onClick={() => setCurrentMode('workspace')}
              >
                Sales Workspace
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${currentMode === 'customer' ? 'active' : ''}`}
                onClick={() => setCurrentMode('customer')}
              >
                Customer Portal
              </button>
            </div>

            {/* Quick Demo Credentials Bar */}
            <div className="quick-demo-section">
              <div className="quick-demo-title">Default Hackathon Logins:</div>
              <div className="quick-demo-grid">
                <button
                  type="button"
                  className="quick-demo-btn"
                  onClick={() => handleQuickLogin('admin@gmail.com', 'admin123', 'workspace')}
                >
                  <span className="demo-role">Admin</span>
                  <span className="demo-email">admin@gmail.com</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-btn"
                  onClick={() => handleQuickLogin('sales@gmail.com', 'sales123', 'workspace')}
                >
                  <span className="demo-role">Sales Rep</span>
                  <span className="demo-email">sales@gmail.com</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-btn"
                  onClick={() => handleQuickLogin('marketing@gmail.com', 'marketing123', 'workspace')}
                >
                  <span className="demo-role">Manager</span>
                  <span className="demo-email">marketing@gmail.com</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-btn"
                  onClick={() => handleQuickLogin('buyer@gmail.com', 'buyer123', 'customer')}
                >
                  <span className="demo-role">Buyer</span>
                  <span className="demo-email">buyer@gmail.com</span>
                </button>
              </div>
            </div>

            <div className="divider-row">or sign in with credentials</div>

            {error && (
              <div className="login-error-alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="loginEmail">
                    {currentMode === 'workspace' ? 'Corporate Email' : 'Customer Email or ID'}
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    className="form-input"
                    placeholder={currentMode === 'workspace' ? 'rep@company.com' : 'buyer@clientcorp.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="loginPassword">
                      Password
                    </label>
                    <a
                      href="#forgot"
                      className="forgot-link"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Password reset link sent to your registered email.');
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    type="password"
                    id="loginPassword"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-submit" disabled={loading}>
                  <span>
                    {loading
                      ? 'Authenticating...'
                      : currentMode === 'workspace'
                      ? 'Sign in to Workspace'
                      : 'Open Negotiation Portal'}
                  </span>
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            <div className="form-footer-note">
              Don't have an organization workspace? <Link to="/signup">Create an Account</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
