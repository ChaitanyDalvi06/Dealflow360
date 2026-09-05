import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import ChatPanel from '../../components/ChatPanel';
import { ArrowLeft, Clock, User, CheckCircle, Package, FileText } from 'lucide-react';

const STATUS_CONFIG = {
  NEW: { color: '#3b82f6', bg: '#eff6ff', label: 'New — Awaiting Assignment' },
  ASSIGNED: { color: '#f59e0b', bg: '#fffbeb', label: 'Assigned — Rep is working on it' },
  QUOTED: { color: '#10b981', bg: '#ecfdf5', label: 'Quoted — Quotation available' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6', label: 'Closed' },
};

export default function PortalRequirementDetail() {
  const { id } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const customer = JSON.parse(localStorage.getItem('df360_portal_customer') || '{}');
  const token = localStorage.getItem('df360_portal_token');

  useEffect(() => {
    const fetchRequirement = async () => {
      try {
        const res = await portalApi.get(`/portal/requirements/${id}`);
        setRequirement(res.data);
      } catch (err) {
        console.error('Failed to load requirement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequirement();
  }, [id]);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="spinner" />
        <p>Loading requirement...</p>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="portal-empty-state">
        <p>Requirement not found.</p>
        <Link to="/portal/dashboard" className="portal-btn portal-btn--outline">Back to Dashboard</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[requirement.status] || STATUS_CONFIG.NEW;
  const items = Array.isArray(requirement.desiredItems) ? requirement.desiredItems : [];
  const showChat = requirement.assignedRepId != null;

  return (
    <div className="portal-req-detail">
      <Link to="/portal/dashboard" className="portal-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="portal-req-detail__grid">
        {/* Left: Requirement Info */}
        <div className="portal-req-detail__info">
          <div className="portal-req-detail__header">
            <h1>{requirement.title}</h1>
            <span className="portal-req-detail__status" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          </div>

          <div className="portal-req-detail__meta">
            <span><Clock size={14} /> Submitted: {new Date(requirement.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            {requirement.assignedRep && (
              <span><User size={14} /> Rep: {requirement.assignedRep.name} ({requirement.assignedRep.email})</span>
            )}
          </div>

          {requirement.notes && (
            <div className="portal-req-detail__notes">
              <h3><FileText size={16} /> Notes</h3>
              <p>{requirement.notes}</p>
            </div>
          )}

          <div className="portal-req-detail__items">
            <h3><Package size={16} /> Requested Items ({items.length})</h3>
            <div className="portal-req-detail__items-list">
              {items.map((item, i) => (
                <div key={i} className="portal-req-item">
                  <span className="portal-req-item__name">{item.productId}</span>
                  <span className="portal-req-item__qty">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Quotations */}
          {requirement.quotations && requirement.quotations.length > 0 && (
            <div className="portal-req-detail__quotations">
              <h3>Quotations</h3>
              {requirement.quotations.map(q => (
                <div key={q.id} className="portal-quotation-card">
                  <div className="portal-quotation-card__header">
                    <span>Quotation</span>
                    <span className="portal-quotation-card__status">{q.status}</span>
                  </div>
                  {q.lines && q.lines.map(line => (
                    <div key={line.id} className="portal-quotation-line">
                      <span>{line.product?.name || 'Product'}</span>
                      <span>×{line.quantity}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Chat Panel */}
        <div className="portal-req-detail__chat">
          <div className="portal-chat-wrapper">
            {requirement.assignedRep ? (
              <div className="portal-chat-assigned-banner">
                <div className="portal-rep-avatar">{requirement.assignedRep.name?.charAt(0) || 'R'}</div>
                <div>
                  <strong>{requirement.assignedRep.name}</strong>
                  <span>Dedicated Sales Representative ({requirement.assignedRep.email})</span>
                </div>
              </div>
            ) : (
              <div className="portal-chat-pending-banner">
                <Clock size={14} />
                <span>Representative assignment in progress. Your messages will be queued for your sales rep.</span>
              </div>
            )}
            <ChatPanel
              requirementId={id}
              token={token}
              currentUserId={customer.id}
              currentUserType="customer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
