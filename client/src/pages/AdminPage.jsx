import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { 
  Sliders, Shield, Tag, Users, CheckCircle, RefreshCw, Save, 
  Plus, Package, Edit2, Trash2, X, AlertTriangle, TrendingUp, DollarSign, Filter
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('PRODUCTS');
  const [products, setProducts] = useState([]);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [approvalConfig, setApprovalConfig] = useState({ managerThreshold: 0, financeThreshold: 5, minMarginFloor: 20 });
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productForm, setProductForm] = useState({
    id: null,
    name: '',
    category: 'Hardware',
    basePrice: '',
    margin: '',
    description: '',
    isPromoted: false,
    isRecurring: false,
  });

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [tiersRes, catsRes, custsRes, prodRes, configRes] = await Promise.all([
        api.get('/admin/discount-tiers'),
        api.get('/admin/category-limits'),
        api.get('/admin/customers'),
        api.get('/admin/products'),
        api.get('/admin/approval-config'),
      ]);
      setDiscountTiers(tiersRes.data);
      setCategoryLimits(catsRes.data);
      setCustomers(custsRes.data);
      setProducts(prodRes.data);
      if (configRes.data) {
        setApprovalConfig({
          id: configRes.data.id,
          managerThreshold: Number(configRes.data.managerThreshold ?? 0),
          financeThreshold: Number(configRes.data.financeThreshold ?? 5),
          minMarginFloor: Number(configRes.data.minMarginFloor ?? 20),
        });
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setFeedback({ type: 'danger', message: 'Failed to load configuration: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
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

  const handleProductMarginChange = (index, val) => {
    const updated = [...products];
    updated[index].margin = Number(val);
    setProducts(updated);
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

  const handleSaveApprovalConfig = async () => {
    try {
      setSaving(true);
      await api.put(`/admin/approval-config/${approvalConfig.id}`, approvalConfig);
      setFeedback({ type: 'success', message: 'Deal governance & gross margin floor thresholds saved!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to save approval config: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const openAddProductModal = () => {
    setIsEditing(false);
    setProductForm({
      id: null,
      name: '',
      category: 'Hardware',
      basePrice: '',
      margin: '35',
      description: '',
      isPromoted: false,
      isRecurring: false,
    });
    setModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    setIsEditing(true);
    setProductForm({
      id: prod.id,
      name: prod.name,
      category: prod.category,
      basePrice: prod.basePrice,
      margin: prod.margin,
      description: prod.description || '',
      isPromoted: Boolean(prod.isPromoted),
      isRecurring: Boolean(prod.isRecurring),
    });
    setModalOpen(true);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category || !productForm.basePrice || productForm.margin === '') {
      setFeedback({ type: 'danger', message: 'Please complete all required fields.' });
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/admin/products/${productForm.id}`, productForm);
        setFeedback({ type: 'success', message: `Product "${productForm.name}" updated successfully!` });
      } else {
        await api.post('/admin/products', productForm);
        setFeedback({ type: 'success', message: `New product "${productForm.name}" added to catalog with ${productForm.margin}% gross margin!` });
      }
      setModalOpen(false);
      // Reload products
      const res = await api.get('/admin/products');
      setProducts(res.data);
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to save product: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Are you sure you want to delete "${prod.name}"?`)) return;
    try {
      setSaving(true);
      await api.delete(`/admin/products/${prod.id}`);
      setFeedback({ type: 'success', message: `Product "${prod.name}" removed from catalog.` });
      const res = await api.get('/admin/products');
      setProducts(res.data);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.error || 'Failed to delete product' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSaveMargins = async () => {
    try {
      setSaving(true);
      await Promise.all(
        products.map(p => api.put(`/admin/products/${p.id}`, { margin: p.margin }))
      );
      setFeedback({ type: 'success', message: 'All product gross margins updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to save margins: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = selectedCatFilter === 'ALL'
    ? products
    : products.filter(p => p.category.toLowerCase() === selectedCatFilter.toLowerCase());

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="admin-container">
      <div className="admin-header card">
        <div className="title-group">
          <h2><Sliders size={24} /> Governance & Product Catalog Administration</h2>
          <p>Configure product gross margins, minimum deal floors, category caps, and enterprise guardrails.</p>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
          <button 
            onClick={() => setFeedback({ type: '', message: '' })} 
            style={{ background: 'none', border: 'none', float: 'right', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'PRODUCTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRODUCTS')}
        >
          <Package size={16} /> Products & Gross Margins ({products.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'GOVERNANCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('GOVERNANCE')}
        >
          <TrendingUp size={16} /> Margin Floor & Approval Rules
        </button>
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
          <Tag size={16} /> Category Discount Limits
        </button>
        <button
          className={`tab-btn ${activeTab === 'CUSTOMERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CUSTOMERS')}
        >
          <Users size={16} /> Master Accounts ({customers.length})
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: PRODUCTS & GROSS MARGINS (NEW FEATURE)
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'PRODUCTS' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Product Catalog & Target Gross Margins</h3>
              <p>Define product pricing, category classification, and baseline gross margin percentages.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={handleQuickSaveMargins} disabled={saving}>
                <Save size={16} /> Save Margin Changes
              </button>
              <button className="btn btn-primary" onClick={openAddProductModal}>
                <Plus size={16} /> Add New Product
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Filter size={14} /> Filter Category:
            </span>
            <button 
              className={`demo-chip ${selectedCatFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCatFilter('ALL')}
            >
              All ({products.length})
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                className={`demo-chip ${selectedCatFilter === cat ? 'active' : ''}`}
                onClick={() => setSelectedCatFilter(cat)}
              >
                {cat} ({products.filter(p => p.category === cat).length})
              </button>
            ))}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Target Gross Margin %</th>
                <th>Margin Health</th>
                <th>Attributes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod, idx) => {
                const marginVal = Number(prod.margin);
                const isHealthy = marginVal >= 35;
                const isModerate = marginVal >= 20 && marginVal < 35;
                const isThin = marginVal < 20;

                return (
                  <tr key={prod.id}>
                    <td>
                      <strong>{prod.name}</strong>
                      {prod.description && (
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{prod.description}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary">{prod.category}</span>
                    </td>
                    <td className="font-mono font-bold">
                      {formatCurrency(prod.basePrice)}
                    </td>
                    <td>
                      <div className="input-with-suffix">
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          step="1"
                          value={prod.margin}
                          onChange={(e) => {
                            const globalIdx = products.findIndex(p => p.id === prod.id);
                            if (globalIdx !== -1) handleProductMarginChange(globalIdx, e.target.value);
                          }}
                          style={{ width: '90px', fontWeight: '600' }}
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td>
                      {isHealthy && (
                        <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8rem', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          ● Healthy ({marginVal}%)
                        </span>
                      )}
                      {isModerate && (
                        <span style={{ color: '#d97706', fontWeight: '600', fontSize: '0.8rem', background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          ● Standard ({marginVal}%)
                        </span>
                      )}
                      {isThin && (
                        <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.8rem', background: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          ▲ Thin Margin ({marginVal}%)
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {prod.isPromoted && (
                          <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Promoted
                          </span>
                        )}
                        {prod.isRecurring && (
                          <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => openEditProductModal(prod)}
                        style={{ marginRight: '0.4rem', padding: '4px 8px' }}
                        title="Edit Product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => handleDeleteProduct(prod)}
                        style={{ color: '#dc2626', padding: '4px 8px' }}
                        title="Delete Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: MARGIN FLOOR & APPROVAL RULES
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'GOVERNANCE' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Enterprise Margin Floor & Approval Routing Rules</h3>
              <p>Configure hard-stop margin thresholds and approval escalation chains.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveApprovalConfig} disabled={saving}>
              <Save size={16} /> Save Governance Rules
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {/* Margin Floor Rule Card */}
            <div style={{ border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#c2410c' }}>
                <AlertTriangle size={20} />
                <h4 style={{ margin: 0 }}>Minimum Deal Margin Floor %</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#7c2d12', lineHeight: 1.4, marginBottom: '1rem' }}>
                Any deal whose overall blended gross margin drops below this floor will <strong>automatically trigger mandatory Finance review</strong>, regardless of individual discount line compliance.
              </p>
              <div className="input-with-suffix" style={{ maxWidth: '160px' }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={approvalConfig.minMarginFloor}
                  onChange={(e) => setApprovalConfig(prev => ({ ...prev, minMarginFloor: e.target.value }))}
                  style={{ fontWeight: '700', fontSize: '1.1rem' }}
                />
                <span style={{ fontWeight: 'bold' }}>%</span>
              </div>
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#9a3412' }}>
                Default: 20% (Prevents margin-eroding high-volume discounting)
              </small>
            </div>

            {/* Discount Risk Score - Finance Escalation Card */}
            <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#1e40af' }}>
                <TrendingUp size={20} />
                <h4 style={{ margin: 0 }}>Finance Risk Escalation Threshold</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.4, marginBottom: '1rem' }}>
                When a quotation's blended discount risk score reaches or exceeds this score, the approval chain requires <strong>both Sales Manager AND Finance Officer</strong> approval.
              </p>
              <div className="input-with-suffix" style={{ maxWidth: '160px' }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={approvalConfig.financeThreshold}
                  onChange={(e) => setApprovalConfig(prev => ({ ...prev, financeThreshold: e.target.value }))}
                  style={{ fontWeight: '700', fontSize: '1.1rem' }}
                />
                <span style={{ fontWeight: 'bold' }}>Score</span>
              </div>
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#1d4ed8' }}>
                Default: 5 (Scores between 0 and 5 route to Sales Manager only)
              </small>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: CUSTOMER TIERS
          ══════════════════════════════════════════════════════════ */}
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
                      {tier.customerTier === 'BRONZE' && 'Strict guardrail for low-volume accounts.'}
                      {tier.customerTier === 'SILVER' && 'Standard commercial limit for growing partners.'}
                      {tier.customerTier === 'GOLD' && 'High-trust ceiling for strategic enterprise accounts.'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: CATEGORY LIMITS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'CATEGORIES' && (
        <div className="card admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Category Margin Discount Limits</h3>
              <p>Ceilings applied per product line category to safeguard product unit economics.</p>
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

      {/* ══════════════════════════════════════════════════════════
          TAB 5: MASTER CUSTOMER ACCOUNTS
          ══════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════
          ADD / EDIT PRODUCT MODAL
          ══════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="#0F2C59" />
                <h3 style={{ margin: 0, color: '#0F2C59' }}>
                  {isEditing ? 'Edit Product & Gross Margin' : 'Add New Product to Catalog'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Enterprise Cloud Backup 5TB"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    required
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Service">Service</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Base Unit Price (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 45000"
                    min="1"
                    step="0.01"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Gross Margin (%) *</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Used for quote telemetry & gating</span>
                </label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 40"
                    min="0"
                    max="100"
                    step="1"
                    value={productForm.margin}
                    onChange={(e) => setProductForm({ ...productForm, margin: e.target.value })}
                    required
                    style={{ fontWeight: 'bold' }}
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Short product specification or summary..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isPromoted}
                    onChange={(e) => setProductForm({ ...productForm, isPromoted: e.target.checked })}
                  />
                  <span>Promoted (Upsell Priority)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isRecurring}
                    onChange={(e) => setProductForm({ ...productForm, isRecurring: e.target.checked })}
                  />
                  <span>Recurring Subscription</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
