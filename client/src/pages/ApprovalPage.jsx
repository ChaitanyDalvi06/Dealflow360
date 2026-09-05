import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getStatusBadgeClass, getRiskBadgeClass, formatDate } from '../utils/formatters';
import { 
  CheckCircle, XCircle, CornerUpLeft, ShieldAlert, Sparkles, 
  Eye, FileText, Clock, User, Check, AlertCircle, ShieldCheck,
  TrendingUp, Layers, Search, ArrowRight, Building2, Percent,
  Award, AlertTriangle, CheckCircle2, RefreshCw, Zap
} from 'lucide-react';

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'APPROVE'|'REJECT'|'RETURN', approval }
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      const pendingList = res.data;

      // Attach Model 2 AI Prediction to each ticket
      const withPredictions = await Promise.all(
        pendingList.map(async (approval) => {
          try {
            const predRes = await api.post(`/approvals/${approval.quotation.id}/predict-acceptance`);
            return { ...approval, prediction: predRes.data };
          } catch {
            return approval;
          }
        })
      );

      setApprovals(withPredictions);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const handleApproved = () => {
      fetchApprovals();
    };
    window.addEventListener('df360:quotation:approved', handleApproved);
    return () => window.removeEventListener('df360:quotation:approved', handleApproved);
  }, []);

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    try {
      setActionLoading(true);
      const { type, approval } = actionModal;
      let endpoint = '';
      if (type === 'APPROVE') endpoint = `/approvals/${approval.id}/approve`;
      if (type === 'REJECT') endpoint = `/approvals/${approval.id}/reject`;
      if (type === 'RETURN') endpoint = `/approvals/${approval.id}/return`;

      await api.post(endpoint, { comments });
      setFeedback({
        type: 'success',
        message: `Quotation ${approval.quotation.quoteNumber} has been ${type.toLowerCase()}ed successfully.`
      });
      setActionModal(null);
      setComments('');
      fetchApprovals();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: 'Action failed: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setActionLoading(false);
    }
  };

  // High-altitude financial computations for the executive KPI strip
  const totalPending = approvals.length;
  const totalExposure = approvals.reduce((sum, a) => sum + (Number(a.quotation?.orderTotal ?? a.quotation?.totalAmount ?? 0)), 0);
  const totalDiscountsAtStake = approvals.reduce((sum, a) => sum + (Number(a.quotation?.totalDiscount ?? 0)), 0);
  const predictedList = approvals.filter(a => a.prediction?.acceptanceProbability !== undefined);
  const avgWinProbability = predictedList.length > 0 
    ? Math.round(predictedList.reduce((sum, a) => sum + a.prediction.acceptanceProbability, 0) / predictedList.length) 
    : 0;

  // Filtered tickets
  const filteredApprovals = useMemo(() => {
    return approvals.filter(item => {
      const q = item.quotation || {};
      const qNum = (q.quoteNumber || '').toLowerCase();
      const cName = (q.customer?.name || '').toLowerCase();
      const cComp = (q.customer?.company || q.customer?.companyName || '').toLowerCase();
      const rName = (q.rep?.name || q.salesRep?.name || '').toLowerCase();
      const s = searchQuery.toLowerCase();

      const matchesSearch = !s || qNum.includes(s) || cName.includes(s) || cComp.includes(s) || rName.includes(s);

      if (!matchesSearch) return false;

      if (levelFilter === 'ALL') return true;
      if (levelFilter === 'HIGH_WIN') return (item.prediction?.acceptanceProbability || 0) >= 60;
      return item.level === levelFilter;
    });
  }, [approvals, searchQuery, levelFilter]);

  return (
    <div className="approvals-container">
      {/* 1. Executive Governance Header */}
      <div className="approvals-header-modern">
        <div className="approvals-header-left">
          <div className="approvals-header-icon">
            <ShieldCheck size={26} />
          </div>
          <div className="approvals-header-text">
            <h2>Deal Governance & Approval Queue</h2>
            <p>Real-time managerial authorization cockpit for discounted quotes and margin risk escalation.</p>
          </div>
        </div>

        <div className="approvals-header-actions">
          <span className="wh-telemetry-badge">
            <span className="wh-telemetry-dot" /> Audit Stream Live
          </span>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchApprovals} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Metric Strip */}
      <div className="approvals-kpi-grid">
        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box amber">
            <Clock size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Pending Decisions</span>
            <div className="approvals-kpi-value">{totalPending}</div>
            <span className="approvals-kpi-sub">Requiring tier escalation</span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box navy">
            <Award size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Deal Value at Stake</span>
            <div className="approvals-kpi-value">{formatCurrency(totalExposure)}</div>
            <span className="approvals-kpi-sub">Active quote pipeline</span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box rose">
            <Percent size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Discount Requested</span>
            <div className="approvals-kpi-value" style={{ color: '#dc2626' }}>
              {formatCurrency(totalDiscountsAtStake)}
            </div>
            <span className="approvals-kpi-sub">
              {totalExposure > 0 ? `${((totalDiscountsAtStake / totalExposure) * 100).toFixed(1)}% of gross total` : 'No exposure'}
            </span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box emerald">
            <Zap size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">AI Win Likelihood</span>
            <div className="approvals-kpi-value" style={{ color: '#059669' }}>
              {avgWinProbability > 0 ? `${avgWinProbability}%` : '--'}
            </div>
            <span className="approvals-kpi-sub">Model 2 Acceptance Predictor</span>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Controls */}
      <div className="approvals-controls-bar">
        <div className="approvals-search-box">
          <Search size={16} color="#64748b" />
          <input 
            type="text"
            placeholder="Search by quote #, client, rep, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="approvals-filter-pills">
          <button 
            className={`approval-pill-btn ${levelFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setLevelFilter('ALL')}
          >
            All Requests ({totalPending})
          </button>
          <button 
            className={`approval-pill-btn ${levelFilter === 'LEVEL_1_REP' ? 'active' : ''}`}
            onClick={() => setLevelFilter('LEVEL_1_REP')}
          >
            Level 1 Rep
          </button>
          <button 
            className={`approval-pill-btn ${levelFilter === 'LEVEL_2_MANAGER' ? 'active' : ''}`}
            onClick={() => setLevelFilter('LEVEL_2_MANAGER')}
          >
            Manager Tier
          </button>
          <button 
            className={`approval-pill-btn ${levelFilter === 'LEVEL_3_FINANCE' ? 'active' : ''}`}
            onClick={() => setLevelFilter('LEVEL_3_FINANCE')}
          >
            Finance Tier
          </button>
          <button 
            className={`approval-pill-btn ${levelFilter === 'HIGH_WIN' ? 'active' : ''}`}
            onClick={() => setLevelFilter('HIGH_WIN')}
          >
            High Win (≥60%)
          </button>
        </div>
      </div>

      {/* Alerts */}
      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* 4. Main Approvals Cards Grid */}
      {filteredApprovals.length === 0 && !loading ? (
        <div className="card empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(15,44,89,0.08)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', fontSize: '1.3rem', marginBottom: '8px' }}>
            Queue Zero — All Deals Authorized!
          </h3>
          <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem' }}>
            There are no pending approval requests matching your current filter criteria. New customer escalations will stream live automatically.
          </p>
        </div>
      ) : (
        <div className="approval-cards-grid-modern">
          {filteredApprovals.map(approval => {
            const q = approval.quotation || {};
            const netVal = q.orderTotal ?? q.totalAmount ?? 0;
            const discountAmt = q.totalDiscount ?? 0;
            const discountPct = netVal > 0 ? ((discountAmt / (netVal + discountAmt)) * 100).toFixed(1) : 0;
            const marginVal = q.marginPct ?? (netVal > 0 ? (q.totalMargin / netVal) * 100 : 25);
            const riskVal = Math.round(q.blendedRiskScore ?? q.riskScore ?? 0);
            
            // Client initials for avatar
            const clientName = q.customer?.company || q.customer?.name || 'Client';
            const initials = clientName
              .split(' ')
              .map(word => word[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            // Win chance styling
            const winProb = approval.prediction?.acceptanceProbability;
            const winStatus = winProb >= 70 ? 'high' : winProb >= 40 ? 'mid' : 'low';
            const winColor = winStatus === 'high' ? '#10b981' : winStatus === 'mid' ? '#f59e0b' : '#ef4444';

            return (
              <div key={approval.id} className="approval-card-modern">
                {/* Card Top Ribbon */}
                <div className="ticket-header-modern">
                  <div className="ticket-badges-group">
                    <span className="ticket-quote-id">{q.quoteNumber || 'QUOTE'}</span>
                    <span className={`badge ${getStatusBadgeClass(approval.level)}`}>
                      {approval.level}
                    </span>
                    <span className={`badge ${getRiskBadgeClass(q.riskLevel || 'LOW')}`}>
                      {q.riskLevel || 'LOW'} RISK
                    </span>
                  </div>
                  <span className="ticket-date-modern">
                    <Clock size={13} /> {formatDate(approval.createdAt)}
                  </span>
                </div>

                {/* Client Profile Section */}
                <div className="ticket-client-hero">
                  <div className="ticket-client-left">
                    <div className="ticket-avatar">
                      {initials}
                    </div>
                    <div className="ticket-client-details">
                      <h4>{q.customer?.name || 'Customer'}</h4>
                      <span>{q.customer?.company || q.customer?.companyName || 'Corporate Client'}</span>
                    </div>
                  </div>

                  <span className={`badge badge-sm ${getStatusBadgeClass(q.customer?.tier || 'BRONZE')}`}>
                    {q.customer?.tier || 'STANDARD'} TIER
                  </span>
                </div>

                {/* Modern Financial Matrix Cockpit (Zero Flat Beige Boxes) */}
                <div className="ticket-financial-matrix">
                  <div className="matrix-cell">
                    <span className="matrix-label">Net Value</span>
                    <span className="matrix-val">{formatCurrency(netVal)}</span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Discount Cut</span>
                    <span className="matrix-val danger">
                      {formatCurrency(discountAmt)}
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '3px', opacity: 0.85 }}>
                        ({discountPct}%)
                      </span>
                    </span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Gross Margin</span>
                    <span className="matrix-val success">{formatPercent(marginVal)}</span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Blended Risk</span>
                    <span className="matrix-val font-mono" style={{ color: riskVal <= 25 ? '#059669' : riskVal <= 50 ? '#d97706' : '#dc2626' }}>
                      {riskVal} / 100
                    </span>
                  </div>
                </div>

                {/* Initiating Representative Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                  <User size={14} color="#0F2C59" />
                  <span>Requested by: <strong style={{ color: '#0F2C59' }}>{q.rep?.name || q.salesRep?.name || 'Sales Representative'}</strong></span>
                </div>

                {/* Escalation Policy Alert Banner */}
                <div className="ticket-escalation-banner">
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {approval.escalationReason ||
                      `Discount requires ${approval.approverRole === 'FINANCE' ? 'Finance' : 'Sales Manager'} authorization.`}
                  </span>
                </div>

                {/* AI Buyer Acceptance Predictor (Model 2) */}
                {approval.prediction && (
                  <div className="ticket-ai-copilot">
                    <div className="ticket-ai-copilot-header">
                      <div className="ticket-ai-brand">
                        <Sparkles size={16} />
                        <span>AI Buyer Acceptance Predictor</span>
                      </div>
                      <span className={`ticket-ai-win-tag ${winStatus}`}>
                        {winProb}% Win Chance
                      </span>
                    </div>

                    <div className="ticket-ai-progress-track">
                      <div 
                        className="ticket-ai-progress-fill"
                        style={{
                          width: `${winProb}%`,
                          background: `linear-gradient(90deg, ${winColor} 0%, #3b82f6 100%)`
                        }}
                      />
                    </div>

                    <div className="ticket-ai-insight">
                      💡 <strong style={{ color: '#0F2C59' }}>Strategic Insight:</strong> {approval.prediction.recommendation}
                    </div>
                  </div>
                )}

                {/* Modern Action Command Bar */}
                <div className="ticket-actions-modern">
                  <button
                    className="btn-details-modern"
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <Eye size={14} /> Full Breakdown
                  </button>

                  <div className="ticket-actions-right">
                    <button
                      className="btn-return-modern"
                      onClick={() => setActionModal({ type: 'RETURN', approval })}
                      title="Return quote to sales rep with counter-discount instructions"
                    >
                      <CornerUpLeft size={14} /> Return
                    </button>
                    <button
                      className="btn-reject-modern"
                      onClick={() => setActionModal({ type: 'REJECT', approval })}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      className="btn-approve-modern"
                      onClick={() => setActionModal({ type: 'APPROVE', approval })}
                    >
                      <CheckCircle2 size={16} /> Authorize & Sign
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Slide-out / Modal */}
      {selectedApproval && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg" style={{ borderRadius: '20px', border: '1px solid rgba(15,44,89,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(15,44,89,0.08)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(15,44,89,0.08)', color: '#0F2C59', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', fontSize: '1.25rem' }}>
                    Quotation {selectedApproval.quotation?.quoteNumber || selectedApproval.quotation?.id?.slice(0, 8)} Audit Breakdown
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Complete financial breakdown & approval lineage</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedApproval(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div className="quote-detail-summary" style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid rgba(15,44,89,0.08)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div>Customer: <strong style={{ color: '#0F2C59' }}>{selectedApproval.quotation?.customer?.name}</strong></div>
                <div>Account Tier: <span className="badge badge-sm" style={{ marginLeft: '6px' }}>{selectedApproval.quotation?.customer?.tier || 'STANDARD'}</span></div>
                <div>Terms: <strong style={{ color: '#0F2C59' }}>{selectedApproval.quotation?.paymentTerms || 'Net 30'}</strong></div>
              </div>

              <h4 className="section-subheading" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', marginBottom: '12px' }}>Quotation Line Items</h4>
              <table className="table quotation-table" style={{ width: '100%', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Product</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Category</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Qty</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Unit Price</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Discount</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.78rem' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedApproval.quotation?.lines?.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}><strong>{l.product?.name}</strong></td>
                      <td style={{ padding: '12px' }}><span className="badge badge-sm">{l.product?.category || 'Hardware'}</span></td>
                      <td style={{ padding: '12px' }}>{l.quantity}</td>
                      <td style={{ padding: '12px' }} className="font-mono">{formatCurrency(l.unitPrice)}</td>
                      <td style={{ padding: '12px', color: '#dc2626', fontWeight: 600 }}>{l.discountPct}%</td>
                      <td style={{ padding: '12px' }} className="font-mono font-bold">{formatCurrency(l.lineTotal ?? l.total ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="audit-trail-preview">
                <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', marginBottom: '14px' }}>Approval Audit History</h4>
                <div className="audit-timeline">
                  {selectedApproval.quotation?.approvalChain?.map((entry, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" style={{ background: '#0F2C59' }} />
                      <div className="timeline-content">
                        <div className="timeline-title">
                          <strong>{entry.level}</strong> : <span className={`badge ${getStatusBadgeClass(entry.status)}`}>{entry.status}</span>
                        </div>
                        {entry.actionBy && <div className="timeline-user">Action by: {entry.actionBy.name}</div>}
                        {entry.comments && <div className="timeline-notes">"{entry.comments}"</div>}
                        <div className="timeline-time">{formatDate(entry.actionAt || entry.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,44,89,0.08)', padding: '16px 24px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedApproval(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {actionModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ borderRadius: '20px', border: '1px solid rgba(15,44,89,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(15,44,89,0.08)', padding: '18px 24px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', fontSize: '1.2rem' }}>
                {actionModal.type === 'APPROVE' && 'Confirm Quotation Authorization'}
                {actionModal.type === 'REJECT' && 'Reject Quotation Discount'}
                {actionModal.type === 'RETURN' && 'Return Quotation with Counter-Guidance'}
              </h3>
              <button className="btn-close" onClick={() => setActionModal(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                Quote: <strong style={{ color: '#0F2C59' }}>{actionModal.approval.quotation?.quoteNumber}</strong> for{' '}
                <strong style={{ color: '#0F2C59' }}>{actionModal.approval.quotation?.customer?.name}</strong>
              </p>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0F2C59', marginBottom: '8px', display: 'block' }}>
                  {actionModal.type === 'APPROVE' ? 'Approval Audit Notes (Optional)' : 'Reason / Counter Guidance (Required)'}
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder={
                    actionModal.type === 'RETURN'
                      ? 'e.g. Please reduce discount on Services line to max 8% and re-submit.'
                      : actionModal.type === 'REJECT'
                      ? 'e.g. Discount violates margin governance ceiling.'
                      : 'Add managerial sign-off notes...'
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  required={actionModal.type !== 'APPROVE'}
                  style={{ borderRadius: '12px', border: '1px solid rgba(15,44,89,0.15)', padding: '12px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid rgba(15,44,89,0.08)', padding: '16px 24px' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${
                  actionModal.type === 'APPROVE' ? 'btn-success' : actionModal.type === 'REJECT' ? 'btn-danger' : 'btn-warning'
                }`}
                disabled={actionLoading || (actionModal.type !== 'APPROVE' && !comments.trim())}
                onClick={handleActionSubmit}
                style={{ borderRadius: '10px', fontWeight: 700 }}
              >
                {actionLoading ? 'Saving...' : `Confirm ${actionModal.type === 'APPROVE' ? 'Authorization' : actionModal.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

