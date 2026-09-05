import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, LogOut, Package, MessageSquare, X } from 'lucide-react';
import { portalApi } from '../../utils/api';
import ChatPanel from '../ChatPanel';

/**
 * Separate portal layout — does NOT share components with internal app.
 * Design system: cream (#F8F0E5) background, navy (#0F2C59) header.
 */
export default function PortalLayout() {
  const navigate = useNavigate();
  const customerData = JSON.parse(localStorage.getItem('df360_portal_customer') || '{}');
  const [requirements, setRequirements] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [showQuickChat, setShowQuickChat] = useState(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const res = await portalApi.get('/portal/requirements');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRequirements(res.data);
          setSelectedReqId(res.data[0].id);
        }
      } catch (err) {
        // Silently handle if not yet loaded
      }
    };
    fetchRequirements();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('df360_portal_token');
    localStorage.removeItem('df360_portal_customer');
    navigate('/');
  };

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <div className="portal-header__brand">
          <Package size={24} />
          <span>DealFlow360</span>
          <span className="portal-header__badge">Customer Portal</span>
        </div>
        <nav className="portal-header__nav">
          <NavLink to="/portal/dashboard" className={({ isActive }) => isActive ? 'portal-nav-link active' : 'portal-nav-link'}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/portal/new-requirement" className={({ isActive }) => isActive ? 'portal-nav-link active' : 'portal-nav-link'}>
            <FilePlus size={16} />
            New Requirement
          </NavLink>
          {requirements.length > 0 && (
            <button
              type="button"
              className={`portal-nav-link portal-nav-link--btn ${showQuickChat ? 'active' : ''}`}
              onClick={() => setShowQuickChat(prev => !prev)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <MessageSquare size={16} />
              Live Chat
            </button>
          )}
        </nav>
        <div className="portal-header__user">
          <span className="portal-header__company">{customerData.company || customerData.name || 'Customer'}</span>
          <span className={`portal-header__tier portal-header__tier--${(customerData.tier || 'BRONZE').toLowerCase()}`}>
            {customerData.tier || 'BRONZE'}
          </span>
          <button className="portal-header__logout" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>
      <main className="portal-main">
        <Outlet />
      </main>

      {/* Floating Chat Widget across all portal pages */}
      {selectedReqId && (
        <div className="portal-floating-chat">
          {showQuickChat && (
            <div className="portal-floating-modal">
              <div className="portal-floating-modal__header">
                <div className="portal-floating-modal__title">
                  <MessageSquare size={16} />
                  <span>Sales Negotiation Chat</span>
                </div>
                <button
                  type="button"
                  className="portal-floating-modal__close"
                  onClick={() => setShowQuickChat(false)}
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>

              {requirements.length > 1 && (
                <div className="portal-floating-modal__select">
                  <span>Requirement:</span>
                  <select
                    value={selectedReqId}
                    onChange={(e) => setSelectedReqId(e.target.value)}
                  >
                    {requirements.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <ChatPanel
                requirementId={selectedReqId}
                compact
                currentUserType="customer"
                currentUserId={customerData.id}
              />
            </div>
          )}

          <button
            type="button"
            className="portal-floating-chat-trigger"
            onClick={() => setShowQuickChat(prev => !prev)}
            title="Chat with Sales Rep"
          >
            <span className="portal-floating-pulse" />
            <MessageSquare size={18} />
            <span>Chat with Sales Rep</span>
          </button>
        </div>
      )}
    </div>
  );
}
