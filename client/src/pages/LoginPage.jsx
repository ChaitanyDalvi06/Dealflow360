import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
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
      try {
        const loggedUser = await login(email, password);
        // Route according to role
        if (loggedUser.role === 'CUSTOMER') {
          localStorage.setItem('df360_portal_token', localStorage.getItem('df360_token'));
          if (loggedUser.customer) {
            localStorage.setItem('df360_portal_customer', JSON.stringify(loggedUser.customer));
          } else {
            localStorage.setItem('df360_portal_customer', JSON.stringify({ id: loggedUser.id, name: loggedUser.name, email: loggedUser.email }));
          }
          navigate('/portal/dashboard');
        } else if (loggedUser.role === 'SALES_REP') {
          navigate('/workspace');
        } else if (loggedUser.role === 'SALES_MANAGER' || loggedUser.role === 'FINANCE') {
          navigate('/approvals');
        } else if (loggedUser.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (internalErr) {
        // Fallback for customer portal authentication
        const res = await api.post('/auth/portal/login', { email, password });
        localStorage.setItem('df360_portal_token', res.data.token);
        localStorage.setItem('df360_portal_customer', JSON.stringify(res.data.customer));
        navigate('/portal/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* Top Simple Navigation */}
      <header className="login-nav">
        <Link to="/#hero" className="logo">
          DealFlow360<span className="logo-dot"></span>
        </Link>
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
              <h2>Log in to DealFlow360</h2>
              <p>Enter your email and password to access your account.</p>
            </div>

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
                    Email
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    className="form-input"
                    placeholder="Enter your email"
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
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
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
