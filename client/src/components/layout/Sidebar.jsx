import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { 
  LayoutDashboard, Layers, FileText, CheckSquare, Users, 
  Package, Warehouse, RotateCcw, CreditCard, BarChart3, 
  UserCog, Settings, TrendingUp
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    // Only fetch if manager/admin/finance
    if (['SALES_MANAGER', 'FINANCE', 'ADMIN'].includes(user?.role)) {
      api.get('/approvals/pending')
        .then(res => setPendingApprovals(Array.isArray(res.data) ? res.data.length : 0))
        .catch(() => setPendingApprovals(0));
    }
  }, [user]);

  const MENU_SECTIONS = [
    {
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/workspace', label: 'Sales Workspace', icon: Layers },
        { path: '/pipeline', label: 'Quotations', icon: FileText },
        { path: '/approvals', label: 'Approvals', icon: CheckSquare, badge: pendingApprovals > 0 ? pendingApprovals : undefined },
        { path: '/admin?tab=CUSTOMERS', label: 'Customers', icon: Users },
        { path: '/workspace', label: 'Products & Price Lists', icon: Package },
        { path: '/warehouse', label: 'Warehouses', icon: Warehouse },
        { path: '/billing', label: 'Subscriptions', icon: RotateCcw },
        { path: '/billing', label: 'Invoices & Billing', icon: CreditCard },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
      ]
    },
    {
      title: 'ADMIN',
      items: [
        { path: '/admin', label: 'User Management', icon: UserCog },
        { path: '/admin', label: 'System Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <Link to="/dashboard" className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-icon-wrap">
          <div className="brand-inner-circle" />
        </div>
        <div className="brand-text">
          <div className="brand-title">DealFlow<span>360</span></div>
          <div className="brand-subtext">Smarter Deals. Stronger Growth.</div>
        </div>
      </Link>

      {/* Navigation List */}
      <div className="sidebar-nav-scroll">
        {MENU_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="sidebar-group">
            {section.title && <div className="sidebar-group-title">{section.title}</div>}
            <div className="sidebar-items-list">
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={iIdx}
                    to={item.path}
                    className={({ isActive }) => 
                      `sidebar-nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="nav-badge-pill">{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Turn Opportunities Box */}
      <div className="sidebar-promo-card">
        <div className="promo-icon-box">
          <TrendingUp size={16} />
        </div>
        <div className="promo-text">
          Turn opportunities into lasting revenue.
        </div>
      </div>

      {/* Bottom Version */}
      <div className="sidebar-bottom-badge">
        <div className="version-circle">360</div>
        <div className="version-info">
          <div className="version-name">DealFlow360</div>
          <div className="version-num">Version 1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
