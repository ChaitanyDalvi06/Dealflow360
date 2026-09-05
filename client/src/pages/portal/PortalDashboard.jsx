import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import { 
  FileText, Clock, CheckCircle2, User, AlertCircle, Plus, 
  Package, MessageSquare, Building2, Calendar, 
  ShieldCheck, Layers, ArrowRight, Search, ChevronRight,
  BadgePercent, Tag, Check, ExternalLink, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  NEW: { 
    color: '#d97706', 
    bg: 'rgba(245, 158, 11, 0.08)', 
    border: 'rgba(245, 158, 11, 0.25)', 
    dotColor: '#f59e0b',
    label: 'Awaiting Rep' 
  },
  ASSIGNED: { 
    color: '#0284c7', 
    bg: 'rgba(2, 132, 199, 0.08)', 
    border: 'rgba(2, 132, 199, 0.25)', 
    dotColor: '#0ea5e9',
    label: 'Under Rep Review' 
  },
  QUOTED: { 
    color: '#059669', 
    bg: 'rgba(16, 185, 129, 0.08)', 
    border: 'rgba(16, 185, 129, 0.25)', 
    dotColor: '#10b981',
    label: 'Quotation Ready' 
  },
  CLOSED: { 
    color: '#64748b', 
    bg: 'rgba(100, 116, 139, 0.08)', 
    border: 'rgba(100, 116, 139, 0.2)', 
    dotColor: '#94a3b8',
    label: 'Completed / Closed' 
  },
};

export default function PortalDashboard() {
  const [requirements, setRequirements] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvedAlert, setApprovedAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const customer = JSON.parse(localStorage.getItem('df360_portal_customer') || '{}');

  const fetchData = async () => {
    try {
      const [reqRes, quotRes] = await Promise.all([
        portalApi.get('/portal/requirements'),
        portalApi.get('/portal/quotations'),
      ]);
      setRequirements(reqRes.data || []);
      setQuotations(quotRes.data || []);
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

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'QUOTED' && req.status === 'QUOTED') ||
        (statusFilter === 'IN_REVIEW' && (req.status === 'ASSIGNED' || req.status === 'NEW')) ||
        (statusFilter === 'CLOSED' && req.status === 'CLOSED');

      const matchesSearch = !searchQuery.trim() || 
        req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(req.desiredItems) && req.desiredItems.some(i => (i.name || i.productId || '').toLowerCase().includes(searchQuery.toLowerCase())));

      return matchesStatus && matchesSearch;
    });
  }, [requirements, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="portal-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#0F2C59' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
        <p style={{ fontWeight: 600, fontSize: '1rem' }}>Loading enterprise procurement workspace...</p>
      </div>
    );
  }

  const quotedCount = requirements.filter(r => r.status === 'QUOTED').length;
  const inReviewCount = requirements.filter(r => r.status === 'ASSIGNED' || r.status === 'NEW').length;
  const closedCount = requirements.filter(r => r.status === 'CLOSED').length;

  return (
    <div className="portal-dashboard">
      {/* Executive Hero Banner */}
      <div className="portal-hero-banner">
        <div className="portal-hero-banner__left">
          <div className="portal-hero-banner__avatar">
            <Building2 size={26} />
          </div>
          <div>
            <div className="portal-hero-banner__pretitle">
              <span>{customer.company || 'Enterprise Account'}</span>
              <span className="portal-hero-banner__tier-chip">
                <ShieldCheck size={13} /> {customer.tier || 'GOLD'} TIER • PRIORITY SLA
              </span>
            </div>
            <h1 className="portal-hero-banner__title">
              Welcome back, {customer.name || 'Enterprise Buyer'}
            </h1>
            <p className="portal-hero-banner__desc">
              Manage product requirements, review multi-tier discounted quotations, and collaborate directly with your dedicated account team.
            </p>
          </div>
        </div>

        <div className="portal-hero-banner__actions">
          <Link to="/portal/new-requirement" className="portal-btn portal-btn--hero">
            <Plus size={18} />
            <span>Create Requirement</span>
          </Link>
        </div>
      </div>

      {/* Real-time Approved Alert Banner for Buyer */}
      {approvedAlert && (
        <div className="portal-approved-alert">
          <div className="portal-approved-alert__content">
            <div className="portal-approved-alert__icon">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <strong>Quotation Approved by Finance Desk!</strong>
              <p>
                Quotation <strong>{approvedAlert.quoteNumber || 'QT-' + (approvedAlert.quotationId || '').slice(-6).toUpperCase()}</strong> for <strong>₹{Number(approvedAlert.orderTotal || 0).toLocaleString('en-IN')}</strong> has been officially approved and is available for your review and digital countersignature.
              </p>
            </div>
          </div>
          <div className="portal-approved-alert__buttons">
            <Link 
              to={`/portal/quote/${approvedAlert.quotationId}`} 
              className="portal-btn portal-btn--sm portal-btn--primary"
            >
              Review Quote <ArrowRight size={14} />
            </Link>
            <button 
              type="button" 
              className="portal-btn portal-btn--sm portal-btn--outline"
              onClick={() => setApprovedAlert(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Executive KPI Stats Grid */}
      <div className="portal-stats-grid">
        <div className="portal-metric-card">
          <div className="portal-metric-card__header">
            <span className="portal-metric-card__label">Active Requirements</span>
            <div className="portal-metric-icon blue">
              <FileText size={20} />
            </div>
          </div>
          <div className="portal-metric-card__value">{requirements.length}</div>
          <div className="portal-metric-card__caption">
            <span>Across all procurement briefs</span>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-card__header">
            <span className="portal-metric-card__label">Formal Quotations</span>
            <div className="portal-metric-icon purple">
              <Package size={20} />
            </div>
          </div>
          <div className="portal-metric-card__value">{quotations.length}</div>
          <div className="portal-metric-card__caption">
            <span>Generated commercial offers</span>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-card__header">
            <span className="portal-metric-card__label">In Rep Review</span>
            <div className="portal-metric-icon amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="portal-metric-card__value">{inReviewCount}</div>
          <div className="portal-metric-card__caption">
            <span>Under pricing & margin analysis</span>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-card__header">
            <span className="portal-metric-card__label">Quoted & Ready</span>
            <div className="portal-metric-icon emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="portal-metric-card__value">{quotedCount}</div>
          <div className="portal-metric-card__caption highlight-green">
            <span>Ready for e-sign or negotiation</span>
          </div>
        </div>
      </div>

      {/* Requirements Section */}
      <section className="portal-req-section">
        {/* Section Header & Interactive Controls */}
        <div className="portal-req-section__header">
          <div className="portal-req-section__title-wrap">
            <div className="portal-section-pill">
              <Layers size={15} /> Procurement Pipeline
            </div>
            <h2>Your Procurement Requirements</h2>
            <p>Track pricing lifecycle, negotiate line-item discounts, and review formal quotations</p>
          </div>

          <div className="portal-req-section__controls">
            <div className="portal-search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search requirements or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                  ×
                </button>
              )}
            </div>

            <div className="portal-filter-tabs">
              <button 
                type="button" 
                className={`portal-filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({requirements.length})
              </button>
              <button 
                type="button" 
                className={`portal-filter-tab ${statusFilter === 'QUOTED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('QUOTED')}
              >
                Quoted ({quotedCount})
              </button>
              <button 
                type="button" 
                className={`portal-filter-tab ${statusFilter === 'IN_REVIEW' ? 'active' : ''}`}
                onClick={() => setStatusFilter('IN_REVIEW')}
              >
                In Review ({inReviewCount})
              </button>
              <button 
                type="button" 
                className={`portal-filter-tab ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CLOSED')}
              >
                Closed ({closedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Grid */}
        {filteredRequirements.length === 0 ? (
          <div className="portal-empty-card">
            <div className="portal-empty-card__icon">
              <Layers size={36} />
            </div>
            <h3>{searchQuery ? 'No matching requirements found' : 'No requirements submitted yet'}</h3>
            <p>
              {searchQuery 
                ? `No requirements match "${searchQuery}". Try clearing your search query or switching filters.`
                : 'Create your first product requirement to receive custom volume pricing and negotiate with your dedicated sales team.'}
            </p>
            {searchQuery ? (
              <button type="button" className="portal-btn portal-btn--outline" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}>
                Clear Filters
              </button>
            ) : (
              <Link to="/portal/new-requirement" className="portal-btn portal-btn--primary">
                <Plus size={16} /> Submit First Requirement
              </Link>
            )}
          </div>
        ) : (
          <div className="portal-req-grid">
            {filteredRequirements.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.NEW;
              const items = Array.isArray(req.desiredItems) ? req.desiredItems : [];
              const hasQuotes = req.quotations && req.quotations.length > 0;
              const latestQuote = hasQuotes ? req.quotations[0] : null;

              return (
                <div key={req.id} className="portal-card-v2">
                  {/* Card Header */}
                  <div className="portal-card-v2__header">
                    <div>
                      <div className="portal-card-v2__badge-row">
                        <span className="portal-card-v2__id">
                          REQ-#{req.id.slice(-4).toUpperCase()}
                        </span>
                        <span className="portal-card-v2__date">
                          <Calendar size={12} /> {new Date(req.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="portal-card-v2__title">{req.title}</h3>
                    </div>

                    <div 
                      className="portal-card-v2__status" 
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <span className="portal-card-v2__status-dot" style={{ background: cfg.dotColor }} />
                      <span>{cfg.label}</span>
                    </div>
                  </div>

                  {/* Customer Notes / Special Instructions */}
                  {req.notes ? (
                    <div className="portal-card-v2__notes">
                      <span className="portal-card-v2__notes-quote">“</span>
                      <p>{req.notes}</p>
                    </div>
                  ) : (
                    <div className="portal-card-v2__notes portal-card-v2__notes--empty">
                      <p>Standard catalog requirements • No special discount terms specified</p>
                    </div>
                  )}

                  {/* Requested Items Tags */}
                  <div className="portal-card-v2__items-wrap">
                    <span className="portal-card-v2__items-label">
                      <Package size={13} /> {items.length} Requested Product{items.length !== 1 ? 's' : ''}:
                    </span>
                    <div className="portal-card-v2__item-chips">
                      {items.map((it, idx) => (
                        <span key={idx} className="portal-item-chip">
                          <strong>{it.name || it.productId}</strong>
                          <span className="portal-item-chip__qty">×{it.quantity}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Sales Rep Strip */}
                  <div className="portal-card-v2__rep-strip">
                    <div className="portal-rep-avatar">
                      {req.assignedRep?.name?.charAt(0) || 'S'}
                    </div>
                    <div className="portal-rep-details">
                      <span className="portal-rep-title">Account Representative</span>
                      <span className="portal-rep-name">
                        {req.assignedRep ? req.assignedRep.name : 'Dedicated Sales Desk'}
                      </span>
                    </div>
                    <span className="portal-rep-status">
                      ● Active
                    </span>
                  </div>

                  {/* Quotation Highlight Action Strip */}
                  {hasQuotes ? (
                    <div className="portal-card-v2__quotes-block">
                      {req.quotations.map(q => {
                        const isApproved = q.status === 'APPROVED';
                        const isRevision = q.status === 'NEEDS_REVISION';
                        return (
                          <div 
                            key={q.id} 
                            className={`portal-quote-strip ${isApproved ? 'portal-quote-strip--approved' : isRevision ? 'portal-quote-strip--revision' : ''}`}
                          >
                            <div className="portal-quote-strip__info">
                              <div className="portal-quote-strip__title">
                                {isApproved ? <CheckCircle2 size={16} color="#059669" /> : <Clock size={16} color="#d97706" />}
                                <strong>Quotation #{q.id.slice(-6).toUpperCase()}</strong>
                                <span className={`portal-quote-pill portal-quote-pill--${q.status?.toLowerCase()}`}>
                                  {q.status}
                                </span>
                              </div>
                              {q.orderTotal && (
                                <span className="portal-quote-strip__amount">
                                  ₹{Number(q.orderTotal).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            <Link 
                              to={`/portal/quote/${q.id}`} 
                              className="portal-quote-strip__cta"
                            >
                              <span>{isApproved ? 'Review & E-Sign' : 'View Quote'}</span>
                              <ChevronRight size={15} />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="portal-quote-pending-box">
                      <Clock size={14} color="#0284c7" />
                      <span>Quotation in preparation by sales desk. You will receive an instant notification upon completion.</span>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="portal-card-v2__footer">
                    <Link 
                      to={`/portal/requirement/${req.id}`} 
                      className="portal-card-v2__chat-btn"
                    >
                      <MessageSquare size={14} />
                      <span>{req.assignedRep ? `Chat with ${req.assignedRep.name}` : 'Open Negotiation Chat'}</span>
                    </Link>

                    <Link 
                      to={`/portal/requirement/${req.id}`} 
                      className="portal-card-v2__view-link"
                    >
                      <span>Requirement Details</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

