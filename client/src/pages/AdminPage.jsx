import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { 
  Sliders, Shield, Tag, Users, CheckCircle, RefreshCw, Save, 
  Plus, Package, Edit2, Trash2, X, AlertTriangle, TrendingUp, DollarSign, Filter,
  CheckCircle2, Laptop, Cpu, Wrench, Headphones, ShieldCheck, Sparkles, Building2
} from 'lucide-react';

function getCategoryPill(category) {
  const catLower = (category || '').toLowerCase();
  if (catLower.includes('hard')) {
    return <span className="cat-pill cat-hardware"><Laptop size={13} /> {category}</span>;
  }
  if (catLower.includes('soft')) {
    return <span className="cat-pill cat-software"><Cpu size={13} /> {category}</span>;
  }
  if (catLower.includes('serv')) {
    return <span className="cat-pill cat-service"><Wrench size={13} /> {category}</span>;
  }
  if (catLower.includes('apparel')) {
    return <span className="cat-pill" style={{ background: '#FCE7F3', color: '#9D174D', border: '1px solid #FBCFE8', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}><Tag size={13} /> {category}</span>;
  }
  return <span className="cat-pill cat-accessories"><Headphones size={13} /> {category}</span>;
}

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
  const [productToDelete, setProductToDelete] = useState(null);
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
    variants: [],
  });

  const handleAddVariantRow = (presetAttr = 'Size', presetVal = '', presetExtra = 0) => {
    setProductForm(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          attribute: presetAttr,
          value: presetVal,
          extraPrice: presetExtra,
          sku: '',
        }
      ]
    }));
  };

  const handleRemoveVariantRow = (index) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, idx) => idx !== index)
    }));
  };

  const handleVariantChange = (index, field, val) => {
    setProductForm(prev => {
      const nextVariants = [...prev.variants];
      nextVariants[index] = { ...nextVariants[index], [field]: val };
      return { ...prev, variants: nextVariants };
    });
  };

  const applyPresetVariants = (type) => {
    if (type === 'apparel') {
      const sizes = ['S', 'M', 'L', 'XL', '2XL'];
      setProductForm(prev => ({
        ...prev,
        variants: sizes.map((s, idx) => ({
          id: 'temp-apparel-' + s,
          attribute: 'Size',
          value: s,
          extraPrice: idx >= 3 ? 150 : 0,
          sku: `${(prev.name || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${s}`
        }))
      }));
    } else if (type === 'storage') {
      const configs = [
        { val: '256GB SSD', extra: 0 },
        { val: '512GB SSD', extra: 4500 },
        { val: '1TB SSD', extra: 9000 },
        { val: '2TB SSD', extra: 18000 },
      ];
      setProductForm(prev => ({
        ...prev,
        variants: configs.map(c => ({
          id: 'temp-storage-' + c.val,
          attribute: 'Storage',
          value: c.val,
          extraPrice: c.extra,
          sku: ''
        }))
      }));
    } else if (type === 'pack') {
      const packs = [
        { val: 'Single Pack (1 unit)', extra: 0 },
        { val: 'Team Pack (5 units)', extra: 3500 },
        { val: 'Bulk Enterprise Pack (25 units)', extra: 15000 },
      ];
      setProductForm(prev => ({
        ...prev,
        variants: packs.map(p => ({
          id: 'temp-pack-' + p.val,
          attribute: 'Pack Size',
          value: p.val,
          extraPrice: p.extra,
          sku: ''
        }))
      }));
    }
  };

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
      setFeedback({ type: 'danger', message: 'Failed to fetch admin governance data: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateTiers = async () => {
    try {
      setSaving(true);
      await api.put('/admin/discount-tiers', { tiers: discountTiers });
      setFeedback({ type: 'success', message: 'Discount governance tiers successfully synchronized with deal pipeline.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to update discount tiers: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategoryLimits = async () => {
    try {
      setSaving(true);
      await api.put('/admin/category-limits', { limits: categoryLimits });
      setFeedback({ type: 'success', message: 'Category discount limits locked and active.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to update category limits: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleTierChange = (index, field, value) => {
    const updated = [...discountTiers];
    updated[index][field] = field === 'role' ? value : Number(value);
    setDiscountTiers(updated);
  };

  const handleCatLimitChange = (index, value) => {
    const updated = [...categoryLimits];
    updated[index].maxDiscountPct = Number(value);
    setCategoryLimits(updated);
  };

  const handleUpdateCustomerTier = async (customerId, newTier) => {
    try {
      setSaving(true);
      await api.put(`/admin/customers/${customerId}/tier`, { tier: newTier });
      setCustomers(customers.map(c => c.id === customerId ? { ...c, tier: newTier } : c));
      setFeedback({ type: 'success', message: `Customer tier updated to ${newTier} successfully.` });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to update customer tier: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
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
      variants: [],
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
      variants: Array.isArray(prod.variants) ? prod.variants.map(v => ({
        id: v.id,
        attribute: v.attribute || 'Variant',
        value: v.value || '',
        extraPrice: Number(v.extraPrice) || 0,
        sku: v.sku || '',
      })) : [],
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

  // Auto-dismiss feedback message after 5 seconds
  useEffect(() => {
    if (feedback.message) {
      const timer = setTimeout(() => {
        setFeedback({ type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setSaving(true);
      await api.delete(`/admin/products/${productToDelete.id}`);
      setFeedback({ type: 'success', message: `Product "${productToDelete.name}" removed from catalog successfully.` });
      setProductToDelete(null);
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
      {/* Executive Header Banner */}
      <div className="admin-header-panel">
        <div className="admin-header-left">
          <div className="admin-header-icon">
            <Sliders size={24} />
          </div>
          <div className="admin-header-text">
            <h2>Governance & Product Catalog Administration</h2>
            <p>Configure product gross margins, minimum deal floors, category caps, and enterprise guardrails.</p>
          </div>
        </div>
        <div className="admin-header-meta">
          <div className="live-policy-pill">
            <span className="pulse-dot" />
            <span>Guardrails Active & Enforced</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Popup Message */}
      {feedback.message && (
        <div 
          className={`alert-banner alert-banner-${feedback.type}`} 
          style={{ 
            borderRadius: '14px', 
            boxShadow: '0 10px 30px -5px rgba(15, 44, 89, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <AlertTriangle size={18} color="#dc2626" />
            )}
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{feedback.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modern Segmented Floating Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'PRODUCTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRODUCTS')}
        >
          <Package size={16} /> 
          <span>Products & Gross Margins</span>
          <span className="tab-count-badge">{products.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'GOVERNANCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('GOVERNANCE')}
        >
          <TrendingUp size={16} /> 
          <span>Margin Floor & Approval Rules</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'TIERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('TIERS')}
        >
          <Shield size={16} /> 
          <span>Customer Tier Guardrails</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'CATEGORIES' ? 'active' : ''}`}
          onClick={() => setActiveTab('CATEGORIES')}
        >
          <Tag size={16} /> 
          <span>Category Discount Limits</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'CUSTOMERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CUSTOMERS')}
        >
          <Users size={16} /> 
          <span>Master Accounts</span>
          <span className="tab-count-badge">{customers.length}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: PRODUCTS & GROSS MARGINS (NEW FEATURE)
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'PRODUCTS' && (
        <div className="admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Product Catalog & Target Gross Margins</h3>
              <p>Define product pricing, category classification, and baseline gross margin percentages.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={handleQuickSaveMargins} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Margin Changes'}
              </button>
              <button className="btn btn-primary" onClick={openAddProductModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Add New Product
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
              <Filter size={14} /> Filter Category:
            </span>
            <button 
              className={`filter-chip-btn ${selectedCatFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCatFilter('ALL')}
            >
              All Products ({products.length})
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                className={`filter-chip-btn ${selectedCatFilter === cat ? 'active' : ''}`}
                onClick={() => setSelectedCatFilter(cat)}
              >
                {cat} ({products.filter(p => p.category === cat).length})
              </button>
            ))}
          </div>

          <div className="modern-table-wrapper">
            <table className="modern-table">
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
                {filteredProducts.map((prod) => {
                  const marginVal = Number(prod.margin);
                  const isHealthy = marginVal >= 35;
                  const isModerate = marginVal >= 20 && marginVal < 35;
                  const isThin = marginVal < 20;

                  return (
                    <tr key={prod.id}>
                      <td>
                        <strong style={{ color: '#0F2C59', fontSize: '0.95rem' }}>{prod.name}</strong>
                        {prod.variants && prod.variants.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.7rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: '4px', fontWeight: '700', border: '1px solid #BFDBFE' }}>
                              {prod.variants.length} Options
                            </span>
                            {prod.variants.slice(0, 3).map((v) => (
                              <span key={v.id || v.value} style={{ fontSize: '0.68rem', background: '#F8FAFC', color: '#334155', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                {v.attribute}: <strong>{v.value}</strong>{Number(v.extraPrice) > 0 ? ` (+₹${Number(v.extraPrice).toLocaleString('en-IN')})` : ''}
                              </span>
                            ))}
                            {prod.variants.length > 3 && (
                              <span style={{ fontSize: '0.68rem', color: '#64748B', alignSelf: 'center' }}>
                                +{prod.variants.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        {prod.description && (
                          <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '2px' }}>{prod.description}</div>
                        )}
                      </td>
                      <td>{getCategoryPill(prod.category)}</td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: '700', color: '#0F2C59' }}>
                          {formatCurrency(prod.basePrice)}
                        </span>
                      </td>
                      <td>
                        <div className="modern-percent-input" style={{ width: '95px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={prod.margin}
                            onChange={(e) => {
                              const globalIdx = products.findIndex(p => p.id === prod.id);
                              if (globalIdx !== -1) handleProductMarginChange(globalIdx, e.target.value);
                            }}
                          />
                          <span className="percent-suffix">%</span>
                        </div>
                      </td>
                      <td>
                        {isHealthy && (
                          <span style={{ color: '#16A34A', fontWeight: '600', fontSize: '0.8rem', background: '#DCFCE7', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} /> Healthy ({marginVal}%)
                          </span>
                        )}
                        {isModerate && (
                          <span style={{ color: '#D97706', fontWeight: '600', fontSize: '0.8rem', background: '#FEF3C7', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} /> Standard ({marginVal}%)
                          </span>
                        )}
                        {isThin && (
                          <span style={{ color: '#DC2626', fontWeight: '600', fontSize: '0.8rem', background: '#FEE2E2', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FECACA', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} /> Thin Margin ({marginVal}%)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {prod.isPromoted && (
                            <span style={{ fontSize: '0.72rem', background: '#E0F2FE', color: '#0369A1', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #BAE6FD' }}>
                              Promoted
                            </span>
                          )}
                          {prod.isRecurring && (
                            <span style={{ fontSize: '0.72rem', background: '#F3E8FF', color: '#7E22CE', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #DDD6FE' }}>
                              Recurring
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button 
                            className="action-icon-btn" 
                            onClick={() => openEditProductModal(prod)}
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="action-icon-btn delete" 
                            onClick={() => setProductToDelete(prod)}
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: MARGIN FLOOR & APPROVAL RULES
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'GOVERNANCE' && (
        <div className="admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Enterprise Margin Floor & Approval Routing Rules</h3>
              <p>Configure hard-stop margin thresholds and approval escalation chains.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveApprovalConfig} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Governance Rules'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {/* Margin Floor Rule Card */}
            <div style={{ border: '1px solid #FED7AA', background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF7ED 100%)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(234, 88, 12, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#EA580C" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#9A3412' }}>Minimum Deal Margin Floor %</h4>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#7C2D12', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Any deal whose overall blended gross margin drops below this floor will <strong>automatically trigger mandatory Finance review</strong>, regardless of individual discount line compliance.
              </p>
              <div className="modern-percent-input" style={{ width: '130px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={approvalConfig.minMarginFloor}
                  onChange={(e) => setApprovalConfig(prev => ({ ...prev, minMarginFloor: e.target.value }))}
                />
                <span className="percent-suffix">%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.85rem', color: '#9A3412', fontSize: '0.8rem', fontWeight: '600' }}>
                <ShieldCheck size={14} /> Default: 20% (Prevents margin-eroding high-volume discounting)
              </div>
            </div>

            {/* Discount Risk Score - Finance Escalation Card */}
            <div style={{ border: '1px solid #BFDBFE', background: 'linear-gradient(135deg, #FBFDFF 0%, #EFF6FF 100%)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} color="#2563EB" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1E3A8A' }}>Finance Risk Escalation Threshold</h4>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#1E3A8A', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                When a quotation's blended discount risk score reaches or exceeds this score, the approval chain requires <strong>both Sales Manager AND Finance Officer</strong> approval.
              </p>
              <div className="modern-percent-input" style={{ width: '130px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={approvalConfig.financeThreshold}
                  onChange={(e) => setApprovalConfig(prev => ({ ...prev, financeThreshold: e.target.value }))}
                />
                <span className="percent-suffix" style={{ right: '8px', fontSize: '0.75rem' }}>SCORE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.85rem', color: '#1D4ED8', fontSize: '0.8rem', fontWeight: '600' }}>
                <ShieldCheck size={14} /> Default: 5 (Scores between 0 and 5 route to Sales Manager only)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: CUSTOMER TIERS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'TIERS' && (
        <div className="admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Account Tier Discount Thresholds</h3>
              <p>Maximum discount a sales rep can grant without escalating to management.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveTiers} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="modern-table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Tier Level</th>
                  <th>Standard Maximum Discount %</th>
                  <th>Enforcement Policy</th>
                </tr>
              </thead>
              <tbody>
                {discountTiers.map((tier, idx) => {
                  const tierUpper = (tier.customerTier || '').toUpperCase();
                  return (
                    <tr key={tier.id}>
                      <td>
                        {tierUpper === 'BRONZE' && <span className="tier-pill tier-bronze"><Shield size={13} /> BRONZE</span>}
                        {tierUpper === 'SILVER' && <span className="tier-pill tier-silver"><Shield size={13} /> SILVER</span>}
                        {tierUpper === 'GOLD' && <span className="tier-pill tier-gold"><Shield size={13} /> GOLD</span>}
                        {!['BRONZE', 'SILVER', 'GOLD'].includes(tierUpper) && (
                          <span className="tier-pill tier-silver"><Shield size={13} /> {tierUpper}</span>
                        )}
                      </td>
                      <td>
                        <div className="modern-percent-input">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={tier.maxDiscountPct}
                            onChange={(e) => handleTierChange(idx, e.target.value)}
                          />
                          <span className="percent-suffix">%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#475569', fontSize: '0.88rem' }}>
                          {tier.customerTier === 'BRONZE' && 'Strict guardrail for low-volume accounts.'}
                          {tier.customerTier === 'SILVER' && 'Standard commercial limit for growing partners.'}
                          {tier.customerTier === 'GOLD' && 'High-trust ceiling for strategic enterprise accounts.'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: CATEGORY LIMITS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'CATEGORIES' && (
        <div className="admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Category Margin Discount Limits</h3>
              <p>Ceilings applied per product line category to safeguard product unit economics.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveCategories} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="modern-table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Product Category</th>
                  <th>Max Category Discount %</th>
                  <th>Margin Protection Status</th>
                </tr>
              </thead>
              <tbody>
                {categoryLimits.map((cat, idx) => (
                  <tr key={cat.id}>
                    <td>{getCategoryPill(cat.category)}</td>
                    <td>
                      <div className="modern-percent-input">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={cat.maxDiscountPct}
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                        />
                        <span className="percent-suffix">%</span>
                      </div>
                    </td>
                    <td>
                      <div className="impact-guardrail-cell">
                        <div className="impact-badge">
                          <ShieldCheck size={14} className="impact-icon" />
                          <span>Guardrail Cap: {cat.maxDiscountPct}% Concession Ceiling</span>
                        </div>
                        <div className="impact-bar-track">
                          <div 
                            className="impact-bar-fill" 
                            style={{ width: `${Math.min(100, Math.max(15, (cat.maxDiscountPct || 0) * 3))}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: MASTER CUSTOMER ACCOUNTS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'CUSTOMERS' && (
        <div className="admin-tab-card">
          <div className="tab-card-header">
            <div>
              <h3>Enterprise Accounts Directory</h3>
              <p>Corporate clients with established commercial terms and price list bindings.</p>
            </div>
          </div>

          <div className="modern-table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Company / Client</th>
                  <th>Account Tier</th>
                  <th>Contact Email</th>
                  <th>Payment Terms</th>
                  <th>Max Discount Ceiling</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const initials = (c.name || 'AC').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const tierUpper = (c.tier || 'STANDARD').toUpperCase();
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F1EAE2', color: '#0F2C59', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.82rem', flexShrink: 0, border: '1px solid rgba(15, 44, 89, 0.1)' }}>
                            {initials}
                          </div>
                          <div>
                            <strong style={{ color: '#0F2C59', fontSize: '0.94rem' }}>{c.name}</strong>
                            <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '1px' }}>{c.company || 'Enterprise Account'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {tierUpper === 'BRONZE' && <span className="tier-pill tier-bronze"><Shield size={12} /> BRONZE</span>}
                        {tierUpper === 'SILVER' && <span className="tier-pill tier-silver"><Shield size={12} /> SILVER</span>}
                        {tierUpper === 'GOLD' && <span className="tier-pill tier-gold"><Shield size={12} /> GOLD</span>}
                        {!['BRONZE', 'SILVER', 'GOLD'].includes(tierUpper) && (
                          <span className="tier-pill tier-silver"><Shield size={12} /> {tierUpper}</span>
                        )}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.88rem' }}>{c.email}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '4px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}>
                          {c.paymentTerms || 'Net 30'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: '700', color: '#0F2C59', fontSize: '0.95rem' }}>
                          {c.maxDiscountLimit || 15}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ADD / EDIT PRODUCT MODAL
          ══════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="modal-backdrop" style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 44, 89, 0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(15, 44, 89, 0.1)', padding: '28px', boxShadow: '0 25px 50px -12px rgba(15, 44, 89, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(15, 44, 89, 0.08)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(15, 44, 89, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F2C59' }}>
                  <Package size={20} />
                </div>
                <h3 style={{ margin: 0, color: '#0F2C59', fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  {isEditing ? 'Edit Product & Gross Margin' : 'Add New Product to Catalog'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="action-icon-btn"
                style={{ borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: '600', color: '#0F2C59', marginBottom: '6px', display: 'block' }}>Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Enterprise Cloud Backup 5TB or Premium Cotton T-Shirt"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  style={{ borderRadius: '10px', padding: '10px 14px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', color: '#0F2C59', marginBottom: '6px', display: 'block' }}>Category *</label>
                  <select
                    className="form-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    style={{ borderRadius: '10px', padding: '10px 14px' }}
                    required
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Service">Service</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Apparel">Apparel / Merchandise</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', color: '#0F2C59', marginBottom: '6px', display: 'block' }}>Base Unit Price (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 45000"
                    min="1"
                    step="0.01"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    style={{ borderRadius: '10px', padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '600', color: '#0F2C59' }}>
                  <span>Target Gross Margin (%) *</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '400' }}>Used for quote telemetry & gating</span>
                </label>
                <div className="modern-percent-input" style={{ width: '130px' }}>
                  <input
                    type="number"
                    placeholder="e.g. 40"
                    min="0"
                    max="100"
                    step="1"
                    value={productForm.margin}
                    onChange={(e) => setProductForm({ ...productForm, margin: e.target.value })}
                    required
                  />
                  <span className="percent-suffix">%</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: '600', color: '#0F2C59', marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Short product specification or summary..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  style={{ borderRadius: '10px', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: '#FAF8F5', borderRadius: '12px', border: '1px solid rgba(15, 44, 89, 0.08)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', color: '#0F2C59' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isPromoted}
                    onChange={(e) => setProductForm({ ...productForm, isPromoted: e.target.checked })}
                    style={{ accentColor: '#0F2C59', width: '16px', height: '16px' }}
                  />
                  <span>Promoted (Upsell Priority)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', color: '#0F2C59' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isRecurring}
                    onChange={(e) => setProductForm({ ...productForm, isRecurring: e.target.checked })}
                    style={{ accentColor: '#0F2C59', width: '16px', height: '16px' }}
                  />
                  <span>Recurring Subscription</span>
                </label>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  PRODUCT VARIANTS CONFIGURATION (ATTRIBUTES, SIZES, OPTIONS)
                  ══════════════════════════════════════════════════════════ */}
              <div style={{
                marginBottom: '1.75rem',
                padding: '1.25rem',
                background: '#F8FAFC',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={16} color="#0F2C59" />
                      <span style={{ fontWeight: '700', color: '#0F2C59', fontSize: '0.95rem' }}>Product Variants & Options</span>
                      <span style={{ fontSize: '0.72rem', background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                        {productForm.variants.length} {productForm.variants.length === 1 ? 'Option' : 'Options'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                      Add dynamic options for any product (e.g. Size, Color, Capacity, Pack, Edition) with differential add-on prices.
                    </p>
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => applyPresetVariants('apparel')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}
                      title="Load S, M, L, XL, 2XL sizes"
                    >
                      + Sizes (S/M/L/XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetVariants('storage')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}
                      title="Load Storage configurations"
                    >
                      + Storage (SSD)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetVariants('pack')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}
                      title="Load Pack Sizes"
                    >
                      + Pack Tiers
                    </button>
                  </div>
                </div>

                {/* Variant rows list */}
                {productForm.variants.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '1.25rem',
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px dashed #CBD5E1',
                    color: '#64748B',
                    fontSize: '0.85rem'
                  }}>
                    <span>No variants configured. Product will sell as a single standard item.</span>
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleAddVariantRow('Size', 'Medium', 0)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '8px', fontWeight: '600' }}
                      >
                        <Plus size={14} style={{ marginRight: '4px' }} /> Add First Variant (e.g. Size / Color / RAM)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 34px',
                      gap: '8px',
                      padding: '0 4px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <span>Attribute</span>
                      <span>Option / Value *</span>
                      <span>Extra Price (+₹)</span>
                      <span>SKU (Optional)</span>
                      <span></span>
                    </div>

                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
                      {productForm.variants.map((v, idx) => (
                        <div
                          key={v.id || idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 34px',
                            gap: '8px',
                            alignItems: 'center',
                            background: '#FFFFFF',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0'
                          }}
                        >
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Size, Color, RAM"
                            value={v.attribute}
                            onChange={(e) => handleVariantChange(idx, 'attribute', e.target.value)}
                            style={{ fontSize: '0.82rem', padding: '6px 8px', borderRadius: '6px' }}
                            required
                          />
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. XL, Navy Blue, 32GB"
                            value={v.value}
                            onChange={(e) => handleVariantChange(idx, 'value', e.target.value)}
                            style={{ fontSize: '0.82rem', padding: '6px 8px', borderRadius: '6px', fontWeight: '600' }}
                            required
                          />
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '7px', top: '7px', fontSize: '0.75rem', color: '#64748B' }}>+₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control"
                              placeholder="0"
                              value={v.extraPrice}
                              onChange={(e) => handleVariantChange(idx, 'extraPrice', e.target.value)}
                              style={{ fontSize: '0.82rem', padding: '6px 6px 6px 24px', borderRadius: '6px', fontFamily: 'JetBrains Mono, monospace' }}
                            />
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. TSH-BLK-XL"
                            value={v.sku || ''}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                            style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: '6px' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="action-icon-btn delete"
                            style={{ width: '32px', height: '32px' }}
                            title="Remove Variant Option"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                      <button
                        type="button"
                        onClick={() => handleAddVariantRow(productForm.variants[productForm.variants.length - 1]?.attribute || 'Size', '', 0)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: '6px', fontWeight: '600' }}
                      >
                        <Plus size={13} style={{ marginRight: '4px' }} /> Add Option Row
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductForm(prev => ({ ...prev, variants: [] }))}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear all variants
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                  style={{ borderRadius: '10px', padding: '10px 18px', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ borderRadius: '10px', padding: '10px 22px', fontWeight: '600' }}
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL (REPLACES BROWSER ALERT) */}
      {productToDelete && (
        <div 
          className="modal-backdrop" 
          style={{ 
            backdropFilter: 'blur(8px)', 
            background: 'rgba(15, 44, 89, 0.65)',
            zIndex: 1100
          }}
          onClick={() => !saving && setProductToDelete(null)}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '440px', 
              width: '90%', 
              borderRadius: '24px', 
              border: '1px solid rgba(220, 38, 38, 0.2)', 
              padding: '32px 28px', 
              boxShadow: '0 25px 60px -15px rgba(15, 44, 89, 0.35)', 
              textAlign: 'center',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              border: '2px solid rgba(239, 68, 68, 0.2)'
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ 
              fontFamily: 'Space Grotesk, sans-serif', 
              fontSize: '1.3rem', 
              fontWeight: 700, 
              color: '#0F2C59', 
              margin: '0 0 10px 0' 
            }}>
              Delete Product?
            </h3>

            <p style={{ 
              fontSize: '0.92rem', 
              color: '#64748b', 
              lineHeight: 1.5, 
              margin: '0 0 24px 0' 
            }}>
              Are you sure you want to delete <strong style={{ color: '#0F2C59' }}>"{productToDelete.name}"</strong>? This will permanently remove it from the product catalog and quotation workspace.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ 
                  flex: 1, 
                  padding: '12px 18px', 
                  borderRadius: '12px', 
                  fontWeight: 600,
                  borderColor: 'rgba(15, 44, 89, 0.2)',
                  color: '#0F2C59'
                }}
                onClick={() => setProductToDelete(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ 
                  flex: 1, 
                  padding: '12px 18px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)', 
                  border: 'none', 
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                }}
                onClick={confirmDeleteProduct}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Delete Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
