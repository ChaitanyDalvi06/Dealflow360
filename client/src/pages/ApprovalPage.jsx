import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getStatusBadgeClass, getRiskBadgeClass, formatDate } from '../utils/formatters';
import { 
  CheckCircle, XCircle, CornerUpLeft, ShieldAlert, Sparkles, 
  Eye, FileText, Clock, User, Check, AlertCircle
} from 'lucide-react';

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'APPROVE'|'REJECT'|'RETURN', approval }
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      setApprovals(res.data);
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

  return (
    <div className="approvals-container">
      <div className="approvals-header card">
        <div className="approvals-title-group">
          <h2>Pending Approval Queue</h2>
          <p>Review and authorize discounted quotations requiring managerial escalation.</p>
        </div>
        <div className="pending-count-tag">
          <Clock size={16} />
          <strong>{approvals.length} Requests Pending</strong>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {approvals.length === 0 && !loading ? (
        <div className="card empty-state">
          <CheckCircle size={48} color="#28a745" />
          <h3>All Caught Up!</h3>
          <p>There are no pending approval requests at your authorization level right now.</p>
        </div>
      ) : (
        <div className="approval-cards-grid">
          {approvals.map(approval => {
            const q = approval.quotation;
            return (
              <div key={approval.id} className="card approval-ticket-card">
                <div className="ticket-top-bar">
                  <div className="ticket-meta">
                    <span className="quote-badge font-mono">{q.quoteNumber}</span>
                    <span className={`badge ${getStatusBadgeClass(approval.level)}`}>
                      {approval.level}
                    </span>
                    <span className={`badge ${getRiskBadgeClass(q.riskLevel)}`}>
                      {q.riskLevel} RISK
                    </span>
                  </div>
                  <span className="ticket-date">{formatDate(approval.createdAt)}</span>
                </div>

                <div className="ticket-customer-section">
                  <div className="ticket-customer-name">
                    <strong>{q.customer?.name}</strong>
                    <span>{q.customer?.company || q.customer?.companyName || 'Corporate Client'}</span>
                  </div>
                  <span className={`badge badge-sm ${getStatusBadgeClass(q.customer?.tier)}`}>
                    {q.customer?.tier} Tier
                  </span>
                </div>

                <div className="ticket-financial-grid">
                  <div className="fin-box">
                    <span className="fin-box-lbl">Net Deal Value</span>
                    <span className="fin-box-val font-mono">{formatCurrency(q.orderTotal ?? q.totalAmount ?? 0)}</span>
                  </div>
                  <div className="fin-box">
                    <span className="fin-box-lbl">Total Discount</span>
                    <span className="fin-box-val font-mono text-danger">
                      {formatCurrency(q.totalDiscount ?? 0)}
                    </span>
                  </div>
                  <div className="fin-box">
                    <span className="fin-box-lbl">Gross Margin</span>
                    <span className="fin-box-val font-mono">
                      {formatPercent(q.marginPct ?? (q.orderTotal > 0 ? (q.totalMargin / q.orderTotal) * 100 : 0))}
                    </span>
                  </div>
                  <div className="fin-box">
                    <span className="fin-box-lbl">Blended Risk</span>
                    <span className="fin-box-val font-mono">
                      {Math.round(q.blendedRiskScore ?? q.riskScore ?? 0)} / 100
                    </span>
                  </div>
                </div>

                {/* Sales rep who initiated */}
                <div className="ticket-rep-info">
                  <User size={14} /> Requested by: <strong>{q.rep?.name || q.salesRep?.name || 'Sales Representative'}</strong>
                </div>

                {/* Trigger reason */}
                <div className="ticket-reason-alert">
                  <AlertCircle size={15} />
                  <span>
                    {approval.escalationReason ||
                      `Discount requires ${approval.approverRole === 'FINANCE' ? 'Finance' : 'Sales Manager'} authorization.`}
                  </span>
                </div>

                {/* Actions Bar */}
                <div className="ticket-actions-bar">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <Eye size={14} /> Details
                  </button>

                  <div className="decision-button-group">
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => setActionModal({ type: 'RETURN', approval })}
                    >
                      <CornerUpLeft size={14} /> Return
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActionModal({ type: 'REJECT', approval })}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      className="btn btn-success btn-sm font-bold"
                      onClick={() => setActionModal({ type: 'APPROVE', approval })}
                    >
                      <CheckCircle size={14} /> Approve
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
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Quotation {selectedApproval.quotation.quoteNumber || selectedApproval.quotation.id?.slice(0, 8)} Breakdown</h3>
              <button className="close-btn" onClick={() => setSelectedApproval(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="quote-detail-summary">
                <div>Customer: <strong>{selectedApproval.quotation.customer?.name}</strong></div>
                <div>Account Tier: <strong>{selectedApproval.quotation.customer?.tier}</strong></div>
                <div>Terms: <strong>{selectedApproval.quotation.paymentTerms || 'Net 30'}</strong></div>
              </div>

              <h4 className="section-subheading">Line Items</h4>
              <table className="table quotation-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedApproval.quotation.lines?.map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.product?.name}</strong></td>
                      <td><span className="badge badge-sm">{l.product?.category || 'Hardware'}</span></td>
                      <td>{l.quantity}</td>
                      <td className="font-mono">{formatCurrency(l.unitPrice)}</td>
                      <td className="text-danger">{l.discountPct}%</td>
                      <td className="font-mono">{formatCurrency(l.lineTotal ?? l.total ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="audit-trail-preview">
                <h4>Approval Audit History</h4>
                <div className="audit-timeline">
                  {selectedApproval.quotation.approvalChain?.map((entry, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" />
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
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedApproval(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {actionModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {actionModal.type === 'APPROVE' && 'Confirm Approval'}
                {actionModal.type === 'REJECT' && 'Reject Quotation'}
                {actionModal.type === 'RETURN' && 'Return Quotation with Counter/Notes'}
              </h3>
              <button className="btn-close" onClick={() => setActionModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Quote: <strong>{actionModal.approval.quotation.quoteNumber}</strong> for{' '}
                <strong>{actionModal.approval.quotation.customer?.name}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">
                  {actionModal.type === 'APPROVE' ? 'Approval Notes (Optional)' : 'Reason / Counter Guidance (Required)'}
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder={
                    actionModal.type === 'RETURN'
                      ? 'e.g. Please reduce discount on Cloud ERP to max 12% and re-submit.'
                      : 'Add comments or feedback...'
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  required={actionModal.type !== 'APPROVE'}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${
                  actionModal.type === 'APPROVE' ? 'btn-success' : actionModal.type === 'REJECT' ? 'btn-danger' : 'btn-warning'
                }`}
                disabled={actionLoading || (actionModal.type !== 'APPROVE' && !comments.trim())}
                onClick={handleActionSubmit}
              >
                {actionLoading ? 'Saving...' : `Confirm ${actionModal.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
