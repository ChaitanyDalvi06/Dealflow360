import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { 
  Sliders, Shield, Tag, Layers, Users, CheckCircle, RefreshCw, Save
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('TIERS');
  const [discountTiers, setDiscountTiers] = useState([]);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [tiersRes, catsRes, custsRes] = await Promise.all([
        api.get('/admin/discount-tiers'),
        api.get('/admin/category-limits'),
        api.get('/admin/customers')
      ]);
      setDiscountTiers(tiersRes.data);
      setCategoryLimits(catsRes.data);
      setCustomers(custsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleTierChange = (index, val) => {
    const updated = [...discountTiers];
    updated[index].maxDiscountPct = Number(val);
    setDiscountTiers(updated);
  };

  const handleCategoryChange = (index, val) => {
    const updated = [...categoryLimits];
    updated[index].maxDiscountPct = Number(val);
    setCategoryLimits(updated);
  };

  const handleSaveTiers = async () => {
    try {
      setSaving(true);
      await Promise.all(
        discountTiers.map(t => api.put(`/admin/discount-tiers/${t.id}`, { maxDiscountPct: t.maxDiscountPct }))
      );
      setFeedback({ type: 'success', message: 'Customer tier discount policies updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to update tiers: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategories = async () => {
    try {
      setSaving(true);
      await Promise.all(
        categoryLimits.map(c => api.put(`/admin/category-limits/${c.id}`, { maxDiscountPct: c.maxDiscountPct }))
      );
      setFeedback({ type: 'success', message: 'Product category discount limits saved!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to update category limits: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header card">
        <div className="title-group">
          <h2><Sliders size={24} /> Governance & System Configuration</h2>
          <p>Define enterprise discount guardrails, tier limits, and organizational rules.</p>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'TIERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('TIERS')}
        >
          <Shield size={16} /> Customer Tier Guardrails
        </button>
        <button
          className={`tab-btn ${activeTab === 'CATEGORIES' ? 'active' : ''}`}
          onClick={() => setActiveTab('CATEGORIES')}
        >
          <Tag size={16} /> Category Margin Caps
        </button>
        <button
          className={`tab-btn ${activeTab === 'CUSTOMERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CUSTOMERS')}
        >
          <Users size={16} /> Master Accounts ({customers.length})
        </button>
      </div>

      {/* Tab 1: Customer Tiers */}
      {activeTab === 'TIERS' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Account Tier Discount Thresholds</h3>
              <p>Maximum discount a sales rep can grant without escalating to management.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveTiers} disabled={saving}>
              <Save size={16} /> Save Changes
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Tier Level</th>
                <th>Standard Maximum Discount %</th>
                <th>Enforcement Policy</th>
              </tr>
            </thead>
            <tbody>
              {discountTiers.map((tier, idx) => (
                <tr key={tier.id}>
                  <td>
                    <span className="tier-tag font-bold">{tier.customerTier}</span>
                  </td>
                  <td>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={tier.maxDiscountPct}
                        onChange={(e) => handleTierChange(idx, e.target.value)}
                        style={{ width: '120px' }}
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">
                      Discounts above this threshold auto-route to Level 2 Manager.
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Category Limits */}
      {activeTab === 'CATEGORIES' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Product Category Margin Protections</h3>
              <p>Hard limits per product family to prevent destructive discounting on low-margin services.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveCategories} disabled={saving}>
              <Save size={16} /> Save Changes
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Product Category</th>
                <th>Max Category Discount %</th>
                <th>Margin Impact</th>
              </tr>
            </thead>
            <tbody>
              {categoryLimits.map((cat, idx) => (
                <tr key={cat.id}>
                  <td><strong>{cat.category}</strong></td>
                  <td>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={cat.maxDiscountPct}
                        onChange={(e) => handleCategoryChange(idx, e.target.value)}
                        style={{ width: '120px' }}
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">
                      Protects gross margins against blended margin erosion.
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Master Customer Accounts */}
      {activeTab === 'CUSTOMERS' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Enterprise Accounts Directory</h3>
              <p>Corporate clients with established commercial terms and price list bindings.</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Company / Client</th>
                <th>Account Tier</th>
                <th>Contact Email</th>
                <th>Terms</th>
                <th>Max Discount</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="text-muted"><small>{c.company || 'Enterprise'}</small></div>
                  </td>
                  <td><span className="badge badge-primary">{c.tier}</span></td>
                  <td>{c.email}</td>
                  <td>{c.paymentTerms || 'Net 30'}</td>
                  <td className="font-mono font-bold">{c.maxDiscountLimit || 15}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
