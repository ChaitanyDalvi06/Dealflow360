import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ShieldCheck, ArrowRight, Mail, Key } from 'lucide-react';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePortalLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/portal/login', {
        email,
        password: magicToken || 'buyer123'
      });
      localStorage.setItem('df360_portal_token', res.data.token);
      localStorage.setItem('df360_portal_customer', JSON.stringify(res.data.customer));
      
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCustomer = async (custEmail, custPass = 'buyer123') => {
    setEmail(custEmail);
    setMagicToken(custPass);
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/portal/login', {
        email: custEmail,
        password: custPass
      });
      localStorage.setItem('df360_portal_token', res.data.token);
      localStorage.setItem('df360_portal_customer', JSON.stringify(res.data.customer));
      navigate('/portal/dashboard');
    } catch (err) {
      setError('Quick login failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-auth-wrapper">
      <div className="portal-auth-card">
        <div className="portal-auth-header">
          <div className="portal-badge-icon">
            <ShieldCheck size={32} />
          </div>
          <h2>Customer Quotation Portal</h2>
          <p>Review, negotiate, and electronically sign your commercial proposals.</p>
        </div>

        {error && <div className="alert-banner alert-banner-danger">{error}</div>}

        <form onSubmit={handlePortalLogin} className="portal-auth-form">
          <div className="form-group">
            <label className="form-label">Procurement / Corporate Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                className="form-control"
                placeholder="buyer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Portal Password / Magic Passcode</label>
            <div className="input-with-icon">
              <Key size={18} className="field-icon" />
              <input
                type="password"
                className="form-control"
                placeholder="•••••••• (default: buyer123)"
                value={magicToken}
                onChange={(e) => setMagicToken(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Portal'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="portal-demo-helpers">
          <p className="demo-label">Quick Customer Login:</p>
          <div className="demo-chips">
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleQuickCustomer('buyer@gmail.com', 'buyer123')}
            >
              <strong>Buyer Account</strong> (buyer@gmail.com)
            </button>
          </div>
        </div>

        <div className="portal-footer">
          <Link to="/login" className="return-link">← Return to Internal Sales Workspace</Link>
        </div>
      </div>
    </div>
  );
}
