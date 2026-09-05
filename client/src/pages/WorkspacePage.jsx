import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatPercent, getStatusBadgeClass, getRiskBadgeClass } from '../utils/formatters';
import { 
  Plus, Trash2, ShieldAlert, Sparkles, CheckCircle, Clock, 
  Send, ExternalLink, RefreshCw, AlertTriangle, Box, Search, Layers, UserCheck
} from 'lucide-react';

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
  }, [quoteIdParam]);

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
  }, [selectedCustomerId, lines]);

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
    if (!selectedCustomerId || lines.length === 0) return;
    try {
      setSaving(true);
      let quoteId = currentQuote?.id;
      
      // Save first if not saved
      if (!quoteId) {
        const createRes = await api.post('/quotations', {
          customerId: selectedCustomerId,
          lines: lines.map(l => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct
          }))
        });
        quoteId = createRes.data.id;
        setCurrentQuote(createRes.data);
      }

      // Trigger submission
      const res = await api.post(`/quotations/${quoteId}/submit`);
      const updated = res.data;
      setCurrentQuote(updated);

      setSuccessModal({
        quote: updated,
        action: updated.status === 'APPROVED' ? 'AUTO_APPROVED' : 'PENDING_APPROVAL'
      });
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
      {/* Top Header Controls */}
      <div className="workspace-header card">
        <div className="workspace-customer-selector">
          <label className="field-label">Target Customer</label>
          <select
            className="form-control"
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
            <span className={`badge ${getStatusBadgeClass(selectedCustomer.tier)}`}>
              {selectedCustomer.tier} Tier
            </span>
            <span className="badge badge-info">
              Default Terms: {selectedCustomer.paymentTerms}
            </span>
            <span className="badge badge-warning">
              Max Discount: {selectedCustomer.maxDiscountLimit || 15}%
            </span>
            {currentQuote && (
              <span className={`badge ${getStatusBadgeClass(currentQuote.status)}`}>
                Quote #{currentQuote.quoteNumber} : {currentQuote.status}
              </span>
            )}
          </div>
        )}

        <div className="workspace-header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCurrentQuote(null);
              setLines([]);
              navigate('/workspace');
            }}
          >
            <Plus size={16} /> New Quote
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* 3-Column Workspace Grid */}
      <div className="workspace-grid">
        {/* Left Column: Product Catalog */}
        <div className="workspace-column catalog-column card">
          <div className="catalog-header">
            <h3><Box size={18} /> Product Catalog</h3>
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

        {/* Center Column: Quotation Line Items */}
        <div className="workspace-column lines-column card">
          <div className="lines-header">
            <div className="lines-title">
              <h3><Layers size={18} /> Quotation Line Items</h3>
              <span className="item-count-badge">{lines.length} items</span>
            </div>
            {calculating && <span className="calculating-indicator"><RefreshCw size={14} className="spin" /> Calculating risk...</span>}
          </div>

          {lines.length === 0 ? (
            <div className="empty-state">
              <Box size={44} className="empty-icon" />
              <h4>No products in quotation</h4>
              <p>Select products from the catalog on the left to start building your quote.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table quotation-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: '90px' }}>Unit Price</th>
                    <th style={{ width: '80px' }}>Qty</th>
                    <th style={{ width: '100px' }}>Disc %</th>
                    <th style={{ width: '110px' }}>Subtotal</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const isOverLimit = line.discountPct > (selectedCustomer?.maxDiscountLimit || 15);
                    return (
                      <tr key={idx} className={isOverLimit ? 'warning-row' : ''}>
                        <td>
                          <div className="line-item-title">{line.name}</div>
                          <div className="line-item-sub">
                            <span className="sku-tag">{line.sku}</span>
                            <span className="badge badge-sm">{line.billingType}</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td>
                          <div className="discount-input-wrapper">
                            <input
                              type="number"
                              className={`form-control form-control-sm ${isOverLimit ? 'is-invalid' : ''}`}
                              min="0"
                              max="100"
                              step="0.5"
                              value={line.discountPct}
                              onChange={(e) => handleLineChange(idx, 'discountPct', e.target.value)}
                            />
                            {isOverLimit && (
                              <span title={`Exceeds ${selectedCustomer?.tier} tier limit!`} className="discount-warn-icon">
                                <AlertTriangle size={14} color="#d9534f" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="line-total-cell font-mono">
                          {formatCurrency(line.total)}
                        </td>
                        <td>
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
          )}
        </div>

        {/* Right Column: AI Risk, Margins & Actions */}
        <div className="workspace-column summary-column">
          {/* Risk & Margin Card */}
          <div className="card risk-card">
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

          {/* AI Upsell & Cross-Sell Card */}
          {upsellRecs.length > 0 && (
            <div className="card ai-upsell-card">
              <div className="ai-card-header">
                <Sparkles size={18} color="#d4af37" />
                <h4>Smart Upsell Engine</h4>
              </div>
              <p className="ai-sub">ML recommended items that increase win rate:</p>
              <div className="upsell-items-list">
                {upsellRecs.map((rec, i) => (
                  <div key={i} className="upsell-item">
                    <div className="upsell-item-content">
                      <div className="upsell-item-name">{rec.product?.name || rec.name}</div>
                      <div className="upsell-reason">{rec.reason || 'Frequently bundled with ERP modules'}</div>
                      <div className="upsell-price font-mono">{formatCurrency(rec.product?.basePrice || rec.basePrice)}</div>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleAddProduct(rec.product || rec)}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
