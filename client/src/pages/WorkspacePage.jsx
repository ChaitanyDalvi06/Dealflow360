import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatPercent, getStatusBadgeClass, getRiskBadgeClass } from '../utils/formatters';
import { 
  Plus, Trash2, ShieldAlert, Sparkles, CheckCircle, Clock, 
  Send, ExternalLink, RefreshCw, AlertTriangle, Box, Search, Layers, UserCheck,
  FileText, Hand, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import RiskBar from '../components/RiskBar';
import ChatPanel from '../components/ChatPanel';

export default function WorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteIdParam = searchParams.get('id');

  // Core state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quotation state
  const [currentQuote, setCurrentQuote] = useState(null);
  const [lines, setLines] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [upsellRecs, setUpsellRecs] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [successModal, setSuccessModal] = useState(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);

  // Requirements state (Feature 4)
  const [unassignedReqs, setUnassignedReqs] = useState([]);
  const [myReqs, setMyReqs] = useState([]);
  const [reqTab, setReqTab] = useState('unassigned');
  const [claimingId, setClaimingId] = useState(null);
  const [activeRequirement, setActiveRequirement] = useState(null);
  const [isReqExpanded, setIsReqExpanded] = useState(false);

  // Discount limits cache (Feature 4 - fetched ONCE)
  const [discountLimits, setDiscountLimits] = useState(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [custRes, prodRes] = await Promise.all([
          api.get('/admin/customers'),
          api.get('/products')
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);

        // If editing existing quote
        if (quoteIdParam) {
          const qRes = await api.get(`/quotations/${quoteIdParam}`);
          const q = qRes.data;
          setCurrentQuote(q);
          setSelectedCustomerId(q.customerId);
          setLines(q.lines.map(l => ({
            productId: l.productId,
            name: l.product.name,
            sku: l.product.sku,
            category: l.product.category,
            billingType: l.product.billingType,
            unitPrice: Number(l.unitPrice),
            quantity: l.quantity,
            discountPct: Number(l.discountPct),
            total: Number(l.total),
            costPrice: Number(l.product.costPrice || 0),
          })));
        } else if (custRes.data.length > 0) {
          setSelectedCustomerId(custRes.data[0].id);
        }
      } catch (err) {
        setFeedback({ type: 'danger', message: 'Failed to load data: ' + (err.response?.data?.error || err.message) });
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const handleApproved = (e) => {
      if (quoteIdParam && e?.detail?.quotationId === quoteIdParam) {
        setCurrentQuote(prev => prev ? { ...prev, status: 'APPROVED' } : prev);
        setFeedback({
          type: 'success',
          message: `🎉 Great news! Quotation ${e.detail.quoteNumber} has been officially approved by Finance!`,
        });
      }
    };
    window.addEventListener('df360:quotation:approved', handleApproved);
    return () => window.removeEventListener('df360:quotation:approved', handleApproved);
  }, [quoteIdParam]);

  // Fetch discount limits ONCE on mount (Feature 4 — cached)
  useEffect(() => {
    api.get('/config/discount-limits')
      .then(res => setDiscountLimits(res.data))
      .catch(err => console.error('Failed to load discount limits:', err));
  }, []);

  // Fetch requirements (Feature 4)
  const fetchRequirements = useCallback(async () => {
    try {
      const [unassignedRes, mineRes] = await Promise.all([
        api.get('/reps/requirements/unassigned'),
        api.get('/reps/requirements/mine'),
      ]);
      setUnassignedReqs(unassignedRes.data);
      setMyReqs(mineRes.data);
    } catch (err) {
      console.error('Failed to load requirements:', err);
    }
  }, []);

  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  // Claim a requirement
  const handleClaim = async (reqId) => {
    try {
      setClaimingId(reqId);
      await api.post(`/reps/requirements/${reqId}/claim`);
      setFeedback({ type: 'success', message: 'Requirement claimed!' });
      fetchRequirements();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.error || 'Failed to claim' });
    } finally {
      setClaimingId(null);
    }
  };

  // Start building quote from a requirement
  const handleBuildQuote = (req) => {
    setActiveRequirement(req);
    setSelectedCustomerId(req.customerId);
    setCurrentQuote(null);
    // Pre-populate lines from desiredItems if possible
    const items = Array.isArray(req.desiredItems) ? req.desiredItems : [];
    const newLines = items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return null;
      return {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        billingType: prod.billingType,
        unitPrice: Number(prod.basePrice),
        quantity: item.quantity || 1,
        discountPct: 0,
        total: Number(prod.basePrice) * (item.quantity || 1),
        costPrice: Number(prod.costPrice || 0),
      };
    }).filter(Boolean);
    if (newLines.length > 0) setLines(newLines);
    setFeedback({ type: 'success', message: `Building quote for "${req.title}". Lines pre-populated from requirement.` });
  };

  // Recalculate Risk & Margins whenever lines or customer change
  const triggerAssessment = useCallback(async () => {
    if (!selectedCustomerId || lines.length === 0) {
      setRiskAssessment(null);
      return;
    }
    try {
      setCalculating(true);
      const res = await api.post('/quotations/calculate-risk', {
        customerId: selectedCustomerId,
        requirementId: activeRequirement?.id,
        lines: lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct
        }))
      });
      setRiskAssessment(res.data);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  }, [selectedCustomerId, lines, activeRequirement]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAssessment();
    }, 300);
    return () => clearTimeout(timer);
  }, [triggerAssessment]);

  // Fetch AI Upsell recommendations
  useEffect(() => {
    if (lines.length > 0) {
      const pIds = lines.map(l => l.productId);
      api.post('/quotations/upsell-recommendations', {
        customerId: selectedCustomerId,
        productIds: pIds
      })
      .then(res => setUpsellRecs(res.data))
      .catch(() => setUpsellRecs([]));
    } else {
      setUpsellRecs([]);
    }
  }, [lines, selectedCustomerId]);

  // Handle adding product from catalog
  const handleAddProduct = (product) => {
    const existingIndex = lines.findIndex(l => l.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...lines];
      updated[existingIndex].quantity += 1;
      const unit = updated[existingIndex].unitPrice;
      const qty = updated[existingIndex].quantity;
      const disc = updated[existingIndex].discountPct;
      updated[existingIndex].total = qty * unit * (1 - disc / 100);
      setLines(updated);
    } else {
      setLines([...lines, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        billingType: product.billingType,
        unitPrice: Number(product.basePrice),
        quantity: 1,
        discountPct: 0,
        total: Number(product.basePrice),
        costPrice: Number(product.costPrice || 0)
      }]);
    }
  };

  // Handle line change (qty, discount)
  const handleLineChange = (index, field, value) => {
    const updated = [...lines];
    const val = Number(value) || 0;
    updated[index][field] = val;
    const unit = updated[index].unitPrice;
    const qty = updated[index].quantity;
    const disc = updated[index].discountPct;
    updated[index].total = Math.max(0, qty * unit * (1 - disc / 100));
    setLines(updated);
  };

  // Handle line remove
  const handleRemoveLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!selectedCustomerId || lines.length === 0) {
      setFeedback({ type: 'warning', message: 'Please select a customer and add at least one line.' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        customerId: selectedCustomerId,
        lines: lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct
        }))
      };

      let res;
      if (currentQuote?.id) {
        res = await api.put(`/quotations/${currentQuote.id}`, payload);
      } else {
        res = await api.post('/quotations', payload);
      }
      setCurrentQuote(res.data);
      setFeedback({ type: 'success', message: `Quotation ${res.data.quoteNumber} saved as draft successfully!` });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Failed to save: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  // Submit for Approval / Finalize
  const handleSubmitApproval = async () => {
    if (!selectedCustomerId || lines.length === 0) {
      setFeedback({ type: 'danger', message: 'Please add at least one product before submitting.' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        customerId: selectedCustomerId,
        requirementId: activeRequirement?.id,
        lines: lines.map(l => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPct: Number(l.discountPct)
        }))
      };

      let quoteId = currentQuote?.id;
      let quoteObj = currentQuote;

      // Always save or update lines first to guarantee DB has items
      if (quoteId) {
        const updateRes = await api.put(`/quotations/${quoteId}`, payload);
        quoteObj = updateRes.data;
        setCurrentQuote(quoteObj);
      } else {
        const createRes = await api.post('/quotations', payload);
        quoteId = createRes.data.id;
        quoteObj = createRes.data;
        setCurrentQuote(quoteObj);
      }

      // Trigger submission
      const res = await api.post(`/quotations/${quoteId}/submit`);
      const submissionResult = res.data;

      setSuccessModal({
        quote: { ...quoteObj, ...submissionResult },
        action: submissionResult.approved || submissionResult.status === 'APPROVED' ? 'AUTO_APPROVED' : 'PENDING_APPROVAL'
      });
      setFeedback({ type: 'success', message: 'Quotation submitted successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Submission failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const categories = ['ALL', 'ERP', 'CRM', 'INFRA', 'SERVICES'];

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="workspace-container">
      {/* Executive Header Controls */}
      <div className="workspace-header">
        <div className="workspace-customer-selector">
          <label>Target Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.companyName || 'Corporate'}) — {c.tier} Tier
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="customer-meta-chips">
            <span className={`meta-chip-tier ${(selectedCustomer.tier || '').toLowerCase()}`}>
              <ShieldCheck size={13} /> {selectedCustomer.tier} Tier
            </span>
            <span className="meta-chip-info">
              Default Terms: {selectedCustomer.paymentTerms || 'Net 30'}
            </span>
            <span className="meta-chip-warning">
              Max Discount: {selectedCustomer.maxDiscountLimit || 15}%
            </span>
            {currentQuote && (
              <span className="meta-chip-info" style={{ background: '#EDE9FE', color: '#6D28D9', borderColor: '#DDD6FE', fontWeight: '700' }}>
                Quote #{currentQuote.quoteNumber} : {currentQuote.status}
              </span>
            )}
          </div>
        )}

        <div className="workspace-header-actions">
          <button
            className={`btn ${isCatalogOpen ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            title={isCatalogOpen ? 'Collapse Catalog for wider quote view' : 'Open Product Catalog'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Box size={15} />
            <span>{isCatalogOpen ? 'Hide Catalog' : 'Add Products'}</span>
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCurrentQuote(null);
              setLines([]);
              navigate('/workspace');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> <span>New Quote</span>
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`} style={{ borderRadius: '12px' }}>
          {feedback.message}
        </div>
      )}

      {/* Sleek Collapsible Requirements Accordion (Replaces bulky mud box) */}
      <div className={`req-banner ${isReqExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="req-banner-header" onClick={() => setIsReqExpanded(!isReqExpanded)}>
          <div className="req-banner-title">
            <FileText size={16} className="req-banner-icon" />
            <span>Customer Inbound Requirements</span>
            <span className={`req-count-pill ${unassignedReqs.length > 0 ? 'active' : ''}`}>
              {unassignedReqs.length} Unassigned
            </span>
            {myReqs.length > 0 && (
              <span className="req-count-pill mine">
                {myReqs.length} Assigned to Me
              </span>
            )}
          </div>
          <button 
            type="button" 
            className="req-toggle-btn"
            onClick={(e) => { e.stopPropagation(); setIsReqExpanded(!isReqExpanded); }}
          >
            {isReqExpanded ? (
              <><span>Collapse</span> <ChevronUp size={14} /></>
            ) : (
              <><span>{unassignedReqs.length > 0 ? 'Review Inbound' : 'View Requirements'}</span> <ChevronDown size={14} /></>
            )}
          </button>
        </div>

        {isReqExpanded && (
          <div className="req-banner-body">
            <div className="req-panel__tabs" style={{ marginBottom: '1rem' }}>
              <button
                className={`req-panel__tab ${reqTab === 'unassigned' ? 'active' : ''}`}
                onClick={() => setReqTab('unassigned')}
              >
                Unassigned Queue ({unassignedReqs.length})
              </button>
              <button
                className={`req-panel__tab ${reqTab === 'mine' ? 'active' : ''}`}
                onClick={() => setReqTab('mine')}
              >
                My Claimed ({myReqs.length})
              </button>
            </div>
            <div className="req-panel__list">
              {reqTab === 'unassigned' && unassignedReqs.length === 0 && (
                <div className="req-panel__empty" style={{ padding: '1.25rem', color: '#64748B', fontSize: '0.88rem' }}>
                  ✓ All inbound customer requirements have been addressed. No pending unassigned items.
                </div>
              )}
              {reqTab === 'mine' && myReqs.length === 0 && (
                <div className="req-panel__empty" style={{ padding: '1.25rem', color: '#64748B', fontSize: '0.88rem' }}>
                  No requirements currently claimed by your account.
                </div>
              )}
              {(reqTab === 'unassigned' ? unassignedReqs : myReqs).map(req => {
                const items = Array.isArray(req.desiredItems) ? req.desiredItems : [];
                return (
                  <div key={req.id} className="req-panel__item" style={{ borderRadius: '12px', border: '1px solid #E2E8F0', padding: '10px 14px' }}>
                    <div className="req-panel__item-info">
                      <div className="req-panel__item-title" style={{ fontWeight: '700', color: '#0F2C59', fontSize: '0.88rem' }}>{req.title}</div>
                      <div className="req-panel__item-meta" style={{ gap: '8px', marginTop: '2px' }}>
                        <span style={{ color: '#64748B' }}>{req.customer?.name}</span>
                        <span className="badge badge-sm">{req.customer?.tier}</span>
                        <span style={{ color: '#64748B' }}>{items.length} requested items</span>
                      </div>
                    </div>
                    {reqTab === 'unassigned' ? (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleClaim(req.id)}
                        disabled={claimingId === req.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px' }}
                      >
                        <Hand size={13} /> {claimingId === req.id ? 'Claiming...' : 'Claim & Quote'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleBuildQuote(req)}
                        style={{ padding: '6px 12px', borderRadius: '8px' }}
                      >
                        Load into Quote
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3-Column Workspace Grid */}
      <div className={`workspace-grid ${!isCatalogOpen ? 'catalog-collapsed' : ''}`}>
        {/* Left Column: Product Catalog */}
        {isCatalogOpen && (
          <div className="workspace-column catalog-column">
            <div className="catalog-header">
              <div className="catalog-header-title-bar">
                <h3><Box size={18} /> Product Catalog</h3>
                <button 
                  className="catalog-collapse-btn" 
                  onClick={() => setIsCatalogOpen(false)}
                  title="Collapse Catalog for full workspace"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search products or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-pill-group">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items List */}
          <div className="product-list-scroll">
            {filteredProducts.map(prod => (
              <div key={prod.id} className="catalog-item">
                <div className="catalog-item-info">
                  <div className="catalog-item-title-row">
                    <span className="catalog-item-name">{prod.name}</span>
                    <span className="badge badge-sm badge-secondary">{prod.billingType}</span>
                  </div>
                  <div className="catalog-item-meta">
                    <span className="sku-tag">{prod.sku}</span>
                    <span className="cat-tag">{prod.category}</span>
                  </div>
                </div>
                <div className="catalog-item-action">
                  <div className="catalog-item-price">{formatCurrency(prod.basePrice)}</div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddProduct(prod)}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Center Column: Quotation Line Items */}
        <div className="workspace-column lines-column">
          <div className="lines-header">
            <div className="lines-title">
              <h3><Layers size={18} /> Quotation Line Items</h3>
              <span className="item-count-badge">{lines.length} {lines.length === 1 ? 'item' : 'items'}</span>
              {!isCatalogOpen && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setIsCatalogOpen(true)}
                  style={{ marginLeft: '12px' }}
                >
                  <Plus size={13} /> Open Catalog
                </button>
              )}
            </div>
            {calculating && <span className="calculating-indicator"><RefreshCw size={14} className="spin" /> Calculating risk...</span>}
          </div>

          {lines.length === 0 ? (
            <div className="empty-state-canvas">
              <div className="empty-state-canvas-icon">
                <Box size={32} />
              </div>
              <h4 className="empty-state-canvas-title">Quotation Workspace is Empty</h4>
              <p className="empty-state-canvas-sub">
                Select products from the catalog on the left to configure custom pricing, volume tiers, and categorical discount guardrails.
              </p>
              {!isCatalogOpen && (
                <button className="btn btn-primary" onClick={() => setIsCatalogOpen(true)} style={{ marginTop: '14px', borderRadius: '10px' }}>
                  <Plus size={16} /> Open Product Catalog
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="quotation-table-wrapper">
                <table className="quotation-table">
                  <thead>
                    <tr>
                      <th className="th-item">Item & Category Guardrail</th>
                      <th className="th-price" style={{ width: '135px' }}>Unit Price</th>
                      <th className="th-qty" style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                      <th className="th-disc" style={{ width: '120px' }}>Disc %</th>
                      <th className="th-total" style={{ width: '140px', textAlign: 'right' }}>Subtotal</th>
                      <th className="th-action" style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const isOverLimit = line.discountPct > (selectedCustomer?.maxDiscountLimit || 15);
                      const catLimit = discountLimits?.categoryLimits?.find(cl => cl.category === line.category);
                      const catLimitPct = catLimit?.maxDiscountPct || 10;
                      const finThreshold = discountLimits?.approvalConfig?.financeThreshold || 5;
                      return (
                        <tr key={idx} className={isOverLimit ? 'warning-row' : ''}>
                          <td className="td-item">
                            <div className="line-item-header">
                              <span className="line-item-title">{line.name}</span>
                              <span className="cat-tag-pill">{line.category}</span>
                            </div>
                            <div className="line-item-sub">
                              <span className="sku-tag">{line.sku}</span>
                              <span className="badge badge-sm">{line.billingType}</span>
                            </div>
                            {discountLimits && (
                              <div className="line-item-risk-wrap">
                                <RiskBar
                                  discountPct={line.discountPct}
                                  categoryLimit={catLimitPct}
                                  financeThreshold={finThreshold}
                                  label=""
                                />
                              </div>
                            )}
                          </td>
                          <td className="td-price">
                            <div className="table-input-currency">
                              <span className="currency-prefix">₹</span>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="td-qty text-center">
                            <input
                              type="number"
                              className="form-control form-control-sm table-qty-input"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="td-disc">
                            <div className="table-input-percent">
                              <input
                                type="number"
                                className={`form-control form-control-sm ${isOverLimit ? 'is-invalid' : ''}`}
                                min="0"
                                max="100"
                                step="0.5"
                                value={line.discountPct}
                                onChange={(e) => handleLineChange(idx, 'discountPct', e.target.value)}
                              />
                              <span className="percent-suffix">%</span>
                              {isOverLimit && (
                                <span title={`Exceeds ${selectedCustomer?.tier} tier limit!`} className="discount-warn-icon">
                                  <AlertTriangle size={14} color="#d9534f" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="line-total-cell font-mono text-right">
                            {formatCurrency(line.total)}
                          </td>
                          <td className="td-action text-center">
                            <button
                              className="btn-icon-trash"
                              onClick={() => handleRemoveLine(idx)}
                              title="Remove line"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Right Column: AI Risk, Margins & Actions */}
        <div className="workspace-column summary-column">
          {/* Risk & Margin Card */}
          <div className="risk-card">
            <div className="risk-card-header">
              <div className="risk-card-title">
                <ShieldAlert size={18} />
                <h3>Risk & Margins</h3>
              </div>
              {riskAssessment && (
                <span className={`badge ${getRiskBadgeClass(riskAssessment.riskLevel)}`}>
                  {riskAssessment.riskLevel} RISK
                </span>
              )}
            </div>

            {/* Financial Summary */}
            <div className="financial-breakdown">
              <div className="fin-row">
                <span className="fin-label">Gross Value</span>
                <span className="fin-val font-mono">{formatCurrency(riskAssessment?.grossAmount || lines.reduce((acc, l) => acc + (l.unitPrice * l.quantity), 0))}</span>
              </div>
              <div className="fin-row discount-row">
                <span className="fin-label">Total Discount</span>
                <span className="fin-val font-mono text-danger">
                  - {formatCurrency(riskAssessment?.totalDiscountAmount || 0)}
                  <small> ({formatPercent(riskAssessment?.effectiveDiscountPct || 0)})</small>
                </span>
              </div>
              <div className="fin-row total-row">
                <span className="fin-label">Net Quote Amount</span>
                <span className="fin-val font-mono text-navy font-bold">{formatCurrency(riskAssessment?.netAmount || lines.reduce((acc, l) => acc + l.total, 0))}</span>
              </div>
            </div>

            {/* Margin Meter */}
            <div className="margin-meter-block">
              <div className="margin-meter-labels">
                <span>Gross Margin</span>
                <span className="font-bold">{formatPercent(riskAssessment?.marginPct || 0)}</span>
              </div>
              <div className="meter-track">
                <div 
                  className="meter-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, (riskAssessment?.marginPct || 0)))}%`,
                    backgroundColor: (riskAssessment?.marginPct || 0) < 25 ? '#dc3545' : (riskAssessment?.marginPct || 0) < 40 ? '#f0ad4e' : '#28a745'
                  }}
                />
              </div>
            </div>

            {/* Blended Risk Score Gauge */}
            <div className="risk-gauge-block">
              <div className="risk-gauge-header">
                <span>Blended Risk Score</span>
                <span className="risk-score-pill">
                  {riskAssessment?.blendedRiskScore !== undefined ? Math.round(riskAssessment.blendedRiskScore) : 0} / 100
                </span>
              </div>
              <div className="meter-track">
                <div 
                  className="meter-fill"
                  style={{
                    width: `${Math.min(100, riskAssessment?.blendedRiskScore || 0)}%`,
                    backgroundColor: (riskAssessment?.blendedRiskScore || 0) > 60 ? '#dc3545' : (riskAssessment?.blendedRiskScore || 0) > 30 ? '#f0ad4e' : '#28a745'
                  }}
                />
              </div>
            </div>

            {/* Required Approval Routing */}
            <div className="approval-level-box">
              <div className="approval-level-title">Required Approval Level:</div>
              <div className="approval-badge-display">
                <UserCheck size={16} />
                <strong>{riskAssessment?.requiredApprovalLevel || 'LEVEL_1_AUTO'}</strong>
              </div>
              <p className="approval-explanation">
                {riskAssessment?.requiredApprovalLevel === 'LEVEL_1_AUTO' && 'Standard terms met. Auto-approves instantly upon submission.'}
                {riskAssessment?.requiredApprovalLevel === 'LEVEL_2_MANAGER' && 'Discount exceeds rep threshold. Requires Sales Manager sign-off.'}
                {riskAssessment?.requiredApprovalLevel === 'LEVEL_3_DIRECTOR' && 'High discount or low margin. Requires Director authorization.'}
              </p>
            </div>

            {/* Model 2: Buyer Acceptance Likelihood for Sales Rep */}
            {riskAssessment?.acceptancePrediction && (
              <div style={{
                margin: '16px 0',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(15, 44, 89, 0.05)',
                border: '1px solid rgba(15, 44, 89, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F2C59' }}>
                    Predicted Buyer Acceptance Rate
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: riskAssessment.acceptancePrediction.acceptanceProbability >= 70 ? '#28a745' : riskAssessment.acceptancePrediction.acceptanceProbability >= 40 ? '#f59e0b' : '#dc3545'
                  }}>
                    {riskAssessment.acceptancePrediction.acceptanceProbability}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${riskAssessment.acceptancePrediction.acceptanceProbability}%`,
                    height: '100%',
                    background: riskAssessment.acceptancePrediction.acceptanceProbability >= 70 ? '#28a745' : riskAssessment.acceptancePrediction.acceptanceProbability >= 40 ? '#f59e0b' : '#dc3545'
                  }} />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {riskAssessment.acceptancePrediction.recommendation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="workspace-actions">
              <button 
                className="btn btn-secondary btn-block"
                onClick={handleSaveDraft}
                disabled={saving || lines.length === 0}
              >
                Save as Draft
              </button>
              <button 
                className="btn btn-primary btn-block btn-lg"
                onClick={handleSubmitApproval}
                disabled={saving || lines.length === 0}
              >
                {saving ? 'Processing...' : (
                  <>
                    <Send size={18} />
                    {riskAssessment?.requiredApprovalLevel === 'LEVEL_1_AUTO' ? 'Auto-Approve & Finalize' : 'Submit for Approval'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chat Panel (Feature 3) — tied to active requirement */}
          {activeRequirement && (
            <ChatPanel
              requirementId={activeRequirement.id}
              token={localStorage.getItem('df360_token')}
              currentUserId={JSON.parse(localStorage.getItem('df360_user') || '{}').id}
              currentUserType="internal"
              compact
            />
          )}
        </div>
      </div>

      {/* Success / Next Action Modal */}
      {successModal && (
        <div className="modal-backdrop">
          <div className="modal-content success-modal">
            <div className="success-icon-banner">
              {successModal.action === 'AUTO_APPROVED' ? (
                <CheckCircle size={48} color="#28a745" />
              ) : (
                <Clock size={48} color="#0F2C59" />
              )}
            </div>
            <h3>
              {successModal.action === 'AUTO_APPROVED'
                ? 'Quotation Auto-Approved!'
                : 'Submitted to Approval Chain'}
            </h3>
            <p className="quote-modal-number">
              Quote Ref: <strong>{successModal.quote.quoteNumber}</strong>
            </p>
            <p className="quote-modal-desc">
              {successModal.action === 'AUTO_APPROVED'
                ? 'All discount thresholds met corporate policy. Customer can now review and sign.'
                : `This quotation was routed to ${successModal.quote.requiredApprovalLevel} due to high discount or custom margins.`}
            </p>

            <div className="modal-button-group">
              {successModal.quote.portalToken && (
                <a
                  href={`/portal/quote/${successModal.quote.portalToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-primary btn-block"
                >
                  <ExternalLink size={16} /> Open Customer Portal View
                </a>
              )}
              <button
                className="btn btn-secondary btn-block"
                onClick={() => navigate('/pipeline')}
              >
                Go to Pipeline Board
              </button>
              {successModal.quote.status === 'APPROVED' && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/warehouse?quoteId=${successModal.quote.id}`)}
                >
                  Proceed to Warehouse Split →
                </button>
              )}
              <button
                className="btn btn-text"
                onClick={() => setSuccessModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
