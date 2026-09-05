import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Layers, FileText, CheckSquare, Users, 
  Package, Warehouse, RotateCcw, CreditCard, BarChart3, 
  UserCog, Settings, TrendingUp, ShieldCheck
} from 'lucide-react';

function getMenuForRole(role) {
  switch (role) {
    case 'SALES_REP':
      return [
        {
          title: 'SALES WORKSPACE',
          items: [
            { path: '/workspace', label: 'Sales Workspace', icon: Layers },
            { path: '/pipeline', label: 'Quotations Pipeline', icon: FileText },
            { path: '/billing', label: 'Invoices & Billing', icon: CreditCard },
          ]
        },
        {
          title: 'ANALYTICS',
          items: [
            { path: '/reports', label: 'Sales Reports', icon: BarChart3 },
          ]
        }
      ];

    case 'SALES_MANAGER':
      return [
        {
          title: 'MANAGEMENT & APPROVALS',
          items: [
            { path: '/approvals', label: 'Discount Approvals', icon: CheckSquare, badge: 'Action' },
            { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
            { path: '/pipeline', label: 'Team Pipeline', icon: FileText },
            { path: '/workspace', label: 'Sales Workspace', icon: Layers },
          ]
        },
        {
          title: 'ANALYTICS & CUSTOMERS',
          items: [
            { path: '/reports', label: 'Margin & Win Reports', icon: BarChart3 },
            { path: '/admin?tab=CUSTOMERS', label: 'Customer Tiers', icon: Users },
          ]
        }
      ];

    case 'FINANCE':
      return [
        {
          title: 'FINANCIAL CONTROLS',
          items: [
            { path: '/approvals', label: 'Financial Approvals', icon: CheckSquare, badge: 'High Risk' },
            { path: '/billing', label: 'Invoices & Billing', icon: CreditCard },
            { path: '/warehouse', label: 'Warehouses & Splits', icon: Warehouse },
            { path: '/billing', label: 'Subscriptions', icon: RotateCcw },
          ]
        },
        {
          title: 'TELEMETRY & AUDIT',
          items: [
            { path: '/reports', label: 'Financial Reports', icon: BarChart3 },
            { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
          ]
        }
      ];

    case 'ADMIN':
    default:
      return [
        {
          title: 'ADMINISTRATION',
          items: [
            { path: '/admin', label: 'System Settings & Limits', icon: Settings },
            { path: '/admin?tab=USERS', label: 'User Management', icon: UserCog },
            { path: '/admin?tab=PRODUCTS', label: 'Products & Price Lists', icon: Package },
          ]
        },
        {
          title: 'OPERATIONS',
          items: [
            { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
            { path: '/approvals', label: 'Approvals Queue', icon: CheckSquare },
            { path: '/workspace', label: 'Sales Workspace', icon: Layers },
            { path: '/pipeline', label: 'Pipeline Board', icon: FileText },
            { path: '/warehouse', label: 'Warehouses', icon: Warehouse },
            { path: '/billing', label: 'Invoices & Subscriptions', icon: CreditCard },
            { path: '/reports', label: 'System Reports', icon: BarChart3 },
          ]
        }
      ];
  }
}

function getHomePathForRole(role) {
  switch (role) {
    case 'SALES_REP': return '/workspace';
    case 'SALES_MANAGER': return '/approvals';
    case 'FINANCE': return '/approvals';
    case 'ADMIN': return '/admin';
    default: return '/dashboard';
  }
}

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'SALES_REP';
  const menuSections = getMenuForRole(role);
  const homePath = getHomePathForRole(role);

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <Link to={homePath} className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-icon-wrap">
          <div className="brand-inner-circle" />
        </div>
        <div className="brand-text">
          <div className="brand-title">DealFlow<span>360</span></div>
          <div className="brand-subtext">Smarter Deals. Stronger Growth.</div>
        </div>
      </Link>

      {/* Role Badge Indicator */}
      <div className="sidebar-role-indicator">
        <span className={`sidebar-role-tag role-tag--${role.toLowerCase().replace('_', '-')}`}>
          <ShieldCheck size={12} />
          {role.replace('_', ' ')}
        </span>
      </div>

      {/* Navigation List */}
      <div className="sidebar-nav-scroll">
        {menuSections.map((section, sIdx) => (
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
          {role === 'SALES_REP' && 'Accelerate deals with automated margin guardrails.'}
          {role === 'SALES_MANAGER' && 'Monitor discount compliance and deal velocity.'}
          {role === 'FINANCE' && 'Protect gross margins across all business units.'}
          {role === 'ADMIN' && 'Governance, rules, and telemetry in one place.'}
        </div>
      </div>

      {/* Bottom Version */}
      <div className="sidebar-bottom-badge">
        <div className="version-circle">360</div>
        <div className="version-info">
          <div className="version-name">DealFlow360</div>
          <div className="version-num">Version 2.0.0</div>
        </div>
      </div>
    </aside>
  );
}
