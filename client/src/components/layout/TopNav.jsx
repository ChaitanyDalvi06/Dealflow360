import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Bell, ChevronDown, LogOut, User, Globe } from 'lucide-react';

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/workspace?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.name || 'Chaitanya Dalvi';
  const displayRole = user?.role ? user.role.replace('_', ' ') : 'Sales Rep';

  return (
    <header className="app-top-nav">
      {/* Date Range Selector Box */}
      <button className="dash-date-picker-btn">
        <Calendar size={17} className="calendar-icon" />
        <span>Aug 1, 2026 – Aug 31, 2026</span>
        <ChevronDown size={15} />
      </button>

      {/* Right Controls */}
      <div className="top-right-group">
        {/* Notification Bell with red dot */}
        <button className="icon-btn notification-btn" title="Notifications">
          <Bell size={19} />
          <span className="notif-badge-dot" />
        </button>

        {/* User Profile Dropdown */}
        <div className="user-profile-menu-container">
          <button 
            className="user-profile-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="user-avatar-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
                alt={displayName}
                className="user-avatar-img"
              />
            </div>
            <div className="user-meta-column">
              <span className="user-name-bold">{displayName}</span>
              <span className="user-role-subtext">{displayRole}</span>
            </div>
            <ChevronDown size={15} className={`chevron-indicator ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown-card">
              <div className="dropdown-header-info">
                <div className="d-name">{displayName}</div>
                <div className="d-email">{user?.email || 'sales@gmail.com'}</div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => {
                  window.open('/portal/login', '_blank');
                  setDropdownOpen(false);
                }}
              >
                <Globe size={15} /> Customer Portal
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  navigate('/admin');
                  setDropdownOpen(false);
                }}
              >
                <User size={15} /> Account Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
