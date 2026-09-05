import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import { FileText, Clock, CheckCircle, User, AlertCircle, Plus, Package, MessageSquare, Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  NEW: { color: '#3b82f6', bg: '#eff6ff', icon: Clock, label: 'New' },
  ASSIGNED: { color: '#f59e0b', bg: '#fffbeb', icon: User, label: 'Assigned' },
  QUOTED: { color: '#10b981', bg: '#ecfdf5', icon: CheckCircle, label: 'Quoted' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6', icon: CheckCircle, label: 'Closed' },
};

export default function PortalDashboard() {
  const [requirements, setRequirements] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [dashboardRecs, setDashboardRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvedAlert, setApprovedAlert] = useState(null);
  const customer = JSON.parse(localStorage.getItem('df360_portal_customer') || '{}');

  const fetchData = async () => {
    try {
      const [reqRes, quotRes] = await Promise.all([
        portalApi.get('/portal/requirements'),
        portalApi.get('/portal/quotations'),
      ]);
      setRequirements(reqRes.data);
      setQuotations(quotRes.data);

      // Fetch Model 1 Recommendations based on customer's recent orders/requirements
      const pIds = [];
      (reqRes.data || []).forEach(r => {
        if (Array.isArray(r.desiredItems)) {
          r.desiredItems.forEach(item => {
            if (item.productId && !pIds.includes(item.productId)) pIds.push(item.productId);
          });
        }
      });
      if (pIds.length > 0) {
        portalApi.post('/portal/upsell-recommendations', { productIds: pIds.slice(0, 5) })
          .then(res => setDashboardRecs(res.data || []))
          .catch(err => console.error('Failed to load dashboard upsell recs:', err));
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleApproved = (e) => {
      fetchData();
      if (e?.detail) {
        setApprovedAlert(e.detail);
      }
    };

    window.addEventListener('df360:quotation:approved', handleApproved);
    return () => window.removeEventListener('df360:quotation:approved', handleApproved);
  }, []);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="portal-dashboard">
      {/* Welcome Header */}
      <div className="portal-welcome">
        <div>
          <h1>Welcome back, {customer.name || 'Customer'}</h1>
          <p>{customer.company || 'Your requirements and quotations'}</p>
        </div>
        <Link to="/portal/new-requirement" className="portal-btn portal-btn--primary">
          <Plus size={16} />
          New Requirement
        </Link>
      </div>

      {/* Real-time Approved Alert Banner for Buyer */}
      {approvedAlert && (
        <div className="alert-banner alert-banner-success" style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: '10px' }}>
          <div>
            <strong style={{ fontSize: '1rem', color: '#065f46' }}>🎉 Quotation Approved by Finance!</strong>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#166534' }}>
              Quotation <strong>{approvedAlert.quoteNumber || 'QT-' + (approvedAlert.quotationId || '').slice(-6).toUpperCase()}</strong> for ₹{Number(approvedAlert.orderTotal || 0).toLocaleString('en-IN')} has been officially approved by Finance and is ready for your review!
            </p>
          </div>
          <button 
            type="button" 
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => setApprovedAlert(null)}
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="portal-stats">
        <div className="portal-stat-card">
          <FileText size={20} />
          <div>
            <span className="portal-stat-card__value">{requirements.length}</span>
            <span className="portal-stat-card__label">Requirements</span>
          </div>
        </div>
        <div className="portal-stat-card">
          <Package size={20} />
          <div>
            <span className="portal-stat-card__value">{quotations.length}</span>
            <span className="portal-stat-card__label">Quotations</span>
          </div>
        </div>
        <div className="portal-stat-card">
          <Clock size={20} />
          <div>
            <span className="portal-stat-card__value">{requirements.filter(r => r.status === 'NEW').length}</span>
            <span className="portal-stat-card__label">Pending</span>
          </div>
        </div>
        <div className="portal-stat-card">
          <CheckCircle size={20} />
          <div>
            <span className="portal-stat-card__value">{requirements.filter(r => r.status === 'QUOTED').length}</span>
            <span className="portal-stat-card__label">Quoted</span>
          </div>
        </div>
      </div>

      {/* Requirements List */}
      <section className="portal-section">
        <h2>Your Requirements</h2>
        {requirements.length === 0 ? (
          <div className="portal-empty-state">
            <AlertCircle size={40} style={{ opacity: 0.3 }} />
            <p>No requirements yet.</p>
            <Link to="/portal/new-requirement" className="portal-btn portal-btn--outline">
              Submit your first requirement
            </Link>
          </div>
        ) : (
          <div className="portal-cards-grid">
            {requirements.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.NEW;
              const StatusIcon = cfg.icon;
              const items = Array.isArray(req.desiredItems) ? req.desiredItems : [];
              return (
                <Link to={`/portal/requirement/${req.id}`} key={req.id} className="portal-req-card">
                  <div className="portal-req-card__header">
                    <h3>{req.title}</h3>
                    <span className="portal-req-card__status" style={{ color: cfg.color, background: cfg.bg }}>
                      <StatusIcon size={14} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="portal-req-card__notes">{req.notes || 'No notes'}</p>
                  <div className="portal-req-card__footer">
                    <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <span>{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                    {req.assignedRep && <span>Rep: {req.assignedRep.name}</span>}
                  </div>
                  {req.quotations && req.quotations.length > 0 && (
                    <div className="portal-req-card__quotes">
                      {req.quotations.map(q => (
                        <span key={q.id} className="portal-req-card__quote-badge">
                          Quote: {q.status}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="portal-req-card__chat-cta">
                    <span className="portal-chat-pill">
                      <MessageSquare size={13} />
                      {req.assignedRep ? `💬 Chat with ${req.assignedRep.name}` : '💬 Open Live Chat'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {/* Model 1: Recommended Complementary Products for Buyer */}
      {dashboardRecs.length > 0 && (
        <section className="portal-section" style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#0284c7" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Recommended Complementary Add-ons (Model 1 Engine)
              </h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Frequently paired with your ordered products
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {dashboardRecs.map(rec => (
              <div key={rec.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{rec.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    {rec.category} • ₹{Number(rec.basePrice || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '8px', fontWeight: 500 }}>
                    {rec.reason || `${rec.lift || rec.liftScore}x lift affinity`}
                  </div>
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                    {rec.lift || rec.liftScore}x Affinity
                  </span>
                  <Link to="/portal/new-requirement" style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                    + Request Add-on
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
