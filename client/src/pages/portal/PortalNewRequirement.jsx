import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import { 
  Plus, Minus, Send, Package, Search, X, Sparkles, CheckCircle, 
  MessageSquare, TrendingUp, PieChart, ShieldCheck, Clock, ArrowRight,
  Layers, ShoppingCart, Tag, Check, Laptop, Shirt, Backpack, Box,
  Info, BarChart3, HelpCircle, ArrowUpRight
} from 'lucide-react';

// Helper to pick dynamic product icon based on category/name
function getProductIcon(product) {
  const text = `${product.name} ${product.category} ${product.description || ''}`.toLowerCase();
  if (text.includes('laptop') || text.includes('computer') || text.includes('hardware')) {
    return Laptop;
  }
  if (text.includes('shirt') || text.includes('jersey') || text.includes('apparel')) {
    return Shirt;
  }
  if (text.includes('backpack') || text.includes('bag')) {
    return Backpack;
  }
  return Package;
}

// Helper to pick category color palette
function getCategoryColor(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('hard') || cat.includes('tech')) {
    return { bg: 'rgba(37, 99, 235, 0.08)', text: '#2563eb', border: 'rgba(37, 99, 235, 0.25)' };
  }
  if (cat.includes('access')) {
    return { bg: 'rgba(16, 185, 129, 0.08)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)' };
  }
  if (cat.includes('soft') || cat.includes('cloud')) {
    return { bg: 'rgba(139, 92, 246, 0.08)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)' };
  }
  return { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)' };
}

// ─── ANIMATED VOLUME DISCOUNT CURVE GRAPH ─────────────────────────
function VolumeDiscountGraph({ totalUnits }) {
  // Volume tiers:
  // 1-9: 3% baseline
  // 10-49: 8% Tier 1
  // 50-149: 15% Tier 2 (Preferred)
  // 150+: 22% Tier 3 (Enterprise Max)
  let discountPct = 0;
  let tierLabel = 'Standard Base';
  let nextMilestoneText = '';

  if (totalUnits === 0) {
    discountPct = 0;
    tierLabel = 'No items added';
    nextMilestoneText = 'Add 10+ units to unlock Tier 1 volume discount';
  } else if (totalUnits < 10) {
    discountPct = 3;
    tierLabel = 'Standard Baseline (3%)';
    nextMilestoneText = `Add ${10 - totalUnits} more unit${10 - totalUnits === 1 ? '' : 's'} to unlock 8% Volume Tier`;
  } else if (totalUnits < 50) {
    discountPct = 8;
    tierLabel = 'Volume Tier 1 (8%)';
    nextMilestoneText = `Add ${50 - totalUnits} more unit${50 - totalUnits === 1 ? '' : 's'} to unlock 15% Preferred Tier`;
  } else if (totalUnits < 150) {
    discountPct = 15;
    tierLabel = 'Preferred Tier 2 (15%)';
    nextMilestoneText = `Add ${150 - totalUnits} more unit${150 - totalUnits === 1 ? '' : 's'} to unlock 22% Enterprise Max Tier`;
  } else {
    discountPct = 22;
    tierLabel = 'Enterprise Max Tier (22%)';
    nextMilestoneText = 'Maximum volume discount bracket unlocked!';
  }

  // Calculate normalized X position along 0 to 200 units (range 40 to 360 on SVG)
  const clampedUnits = Math.min(200, Math.max(0, totalUnits));
  const beaconX = 40 + (clampedUnits / 200) * 320;
  // Curve height calculation (SVG y is inverted: 130 is 0%, 25 is 25%)
  const beaconY = 130 - (discountPct / 25) * 95;

  return (
    <div className="portal-graph-card">
      <div className="portal-graph-card__header">
        <div className="portal-graph-card__title">
          <TrendingUp size={16} color="#2563eb" />
          <span>Volume Discount Intelligence Curve</span>
        </div>
        <span className="portal-graph-badge">
          {discountPct}% Projected Discount
        </span>
      </div>

      <div className="portal-graph-svg-wrap">
        <svg viewBox="0 0 400 150" className="portal-animated-svg">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="40" y1="130" x2="380" y2="130" stroke="rgba(15, 44, 89, 0.08)" strokeDasharray="4" />
          <line x1="40" y1="85" x2="380" y2="85" stroke="rgba(15, 44, 89, 0.08)" strokeDasharray="4" />
          <line x1="40" y1="40" x2="380" y2="40" stroke="rgba(15, 44, 89, 0.08)" strokeDasharray="4" />

          {/* Tier Threshold Vertical Markers */}
          {/* 10 units */}
          <line x1="56" y1="20" x2="56" y2="130" stroke="rgba(15, 44, 89, 0.06)" />
          <text x="56" y="142" fontSize="9" fill="#94a3b8" textAnchor="middle">10u</text>

          {/* 50 units */}
          <line x1="120" y1="20" x2="120" y2="130" stroke="rgba(15, 44, 89, 0.06)" />
          <text x="120" y="142" fontSize="9" fill="#94a3b8" textAnchor="middle">50u</text>

          {/* 150 units */}
          <line x1="280" y1="20" x2="280" y2="130" stroke="rgba(15, 44, 89, 0.06)" />
          <text x="280" y="142" fontSize="9" fill="#94a3b8" textAnchor="middle">150u</text>

          {/* Area Fill */}
          <path
            d="M 40 130 Q 100 115, 140 85 T 280 45 T 380 35 L 380 130 Z"
            fill="url(#curveGradient)"
          />

          {/* Animated Curve Path */}
          <path
            d="M 40 130 Q 100 115, 140 85 T 280 45 T 380 35"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="portal-curve-draw"
          />

          {/* Current Volume Beacon */}
          {totalUnits > 0 && (
            <g className="portal-beacon-group" transform={`translate(${beaconX}, ${beaconY})`}>
              <circle r="12" fill="#2563eb" opacity="0.2" className="portal-beacon-pulse" />
              <circle r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            </g>
          )}
        </svg>
      </div>

      <div className="portal-graph-card__footer">
        <div className="portal-graph-metric">
          <span className="label">Current Status:</span>
          <strong className="value">{tierLabel}</strong>
        </div>
        <div className="portal-graph-milestone">
          <Info size={13} />
          <span>{nextMilestoneText}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ANIMATED CATEGORY COMPOSITION DONUT ─────────────────────────
function CategoryDonutGraph({ selectedItems }) {
  const categoryCounts = useMemo(() => {
    const counts = {};
    selectedItems.forEach(item => {
      const cat = item.category || 'General';
      counts[cat] = (counts[cat] || 0) + item.quantity;
    });
    return counts;
  }, [selectedItems]);

  const totalUnits = useMemo(() => {
    return Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  }, [categoryCounts]);

  const categories = Object.keys(categoryCounts);

  const colors = ['#2563eb', '#10b981', '#7c3aed', '#f59e0b', '#ec4899'];

  if (totalUnits === 0) {
    return (
      <div className="portal-donut-card portal-donut-card--empty">
        <PieChart size={24} color="#94a3b8" />
        <span>Select items to visualize order category distribution</span>
      </div>
    );
  }

  // Calculate SVG stroke dashes for donut
  const circumference = 2 * Math.PI * 36; // radius = 36 -> ~226.2
  let accumulatedPercent = 0;

  const slices = categories.map((cat, idx) => {
    const qty = categoryCounts[cat];
    const pct = qty / totalUnits;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += pct;
    return {
      category: cat,
      qty,
      pct: Math.round(pct * 100),
      color: colors[idx % colors.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="portal-donut-card">
      <div className="portal-donut-card__header">
        <div className="portal-donut-card__title">
          <PieChart size={16} color="#7c3aed" />
          <span>Requirement Composition</span>
        </div>
        <span className="portal-donut-pill">{categories.length} Categor{categories.length === 1 ? 'y' : 'ies'}</span>
      </div>

      <div className="portal-donut-body">
        <div className="portal-donut-svg-wrap">
          <svg viewBox="0 0 100 100" className="portal-donut-svg">
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="transparent"
              stroke="rgba(15, 44, 89, 0.06)"
              strokeWidth="12"
            />
            {slices.map((s, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={s.strokeDasharray}
                strokeDashoffset={s.strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="portal-donut-slice"
              />
            ))}
          </svg>
          <div className="portal-donut-center">
            <strong>{totalUnits}</strong>
            <span>Units</span>
          </div>
        </div>

        <div className="portal-donut-legend">
          {slices.map((s, i) => (
            <div key={i} className="portal-legend-row">
              <span className="dot" style={{ background: s.color }} />
              <span className="name">{s.category}</span>
              <span className="qty">{s.qty} ({s.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export default function PortalNewRequirement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ productId, quantity, name, category, unit }]
  const [upsellRecs, setUpsellRecs] = useState([]);
  const [recQuantities, setRecQuantities] = useState({});
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');

  const customer = JSON.parse(localStorage.getItem('df360_portal_customer') || '{}');

  const getRecQty = (id) => recQuantities[id] || 1;
  const setRecQty = (id, val) => {
    const parsed = parseInt(val, 10);
    setRecQuantities(prev => ({ ...prev, [id]: isNaN(parsed) ? 1 : Math.max(1, parsed) }));
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setLoadError('');
      const res = await portalApi.get('/portal/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setLoadError('Failed to load catalog products. Please check connection and retry.');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch Model 1 Upsell recommendations whenever items are selected
  const selectedProductIdsKey = selectedItems.map(i => i.productId).sort().join(',');

  useEffect(() => {
    if (selectedItems.length > 0) {
      const pIds = selectedItems.map(i => i.productId);
      portalApi.post('/portal/upsell-recommendations', { productIds: pIds })
        .then(res => {
          setUpsellRecs(res.data || []);
        })
        .catch(() => setUpsellRecs([]));
    } else {
      setUpsellRecs([]);
    }
  }, [selectedProductIdsKey]);

  const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
      const matchesSearch = !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const totalUnits = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [selectedItems]);

  const addItem = (product, initialQty = 1) => {
    const qtyToAdd = Math.max(1, Number(initialQty) || 1);
    const existing = selectedItems.find(i => i.productId === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
      ));
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        quantity: qtyToAdd,
        name: product.name,
        category: product.category,
        unit: product.unit,
      }]);
    }
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter(i => i.productId !== productId));
    } else {
      setSelectedItems(selectedItems.map(i =>
        i.productId === productId ? { ...i, quantity: qty } : i
      ));
    }
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter(i => i.productId !== productId));
  };

  const appendNoteTag = (tagText) => {
    setNotes(prev => {
      if (!prev.trim()) return tagText;
      return `${prev.trim()} • ${tagText}`;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a brief requirement title (e.g., Q3 Equipment Refresh)');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please add at least one product from the catalog below to your requirement');
      return;
    }

    try {
      setSubmitting(true);
      const res = await portalApi.post('/portal/requirements', {
        title: title.trim(),
        notes: notes.trim(),
        desiredItems: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });

      let orderRecs = [...upsellRecs];
      if (orderRecs.length === 0) {
        try {
          const recRes = await portalApi.post('/portal/upsell-recommendations', {
            productIds: selectedItems.map(i => i.productId)
          });
          orderRecs = recRes.data || [];
        } catch (e) {
          console.error('Failed to fetch post-order recs:', e);
        }
      }

      setSubmittedOrder({
        id: res.data?.id || res.data?.requirement?.id,
        title: title.trim(),
        items: [...selectedItems],
        recommendations: orderRecs,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit requirement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── POST-SUBMISSION SUCCESS SCREEN ─────────────────────────────
  if (submittedOrder) {
    return (
      <div className="portal-submitted-view">
        <div className="portal-submitted-card">
          <div className="portal-submitted-header">
            <div className="portal-success-ring">
              <CheckCircle size={36} color="#10b981" />
            </div>
            <div>
              <span className="portal-success-badge">Official Requirement Queued</span>
              <h2>Requirement Submitted to Sales Desk!</h2>
              <p>
                Your procurement request <strong>"{submittedOrder.title}"</strong> has been assigned to account management for automated volume pricing formulation.
              </p>
            </div>
          </div>

          <div className="portal-submitted-items-box">
            <div className="portal-submitted-items-label">
              <Package size={15} /> Requested Line Items ({submittedOrder.items.length})
            </div>
            <div className="portal-submitted-chips">
              {submittedOrder.items.map((it, idx) => (
                <div key={idx} className="portal-submitted-chip">
                  <strong>{it.name || it.productId}</strong>
                  <span className="qty">×{it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="portal-submitted-actions">
            {submittedOrder.id && (
              <Link to={`/portal/requirement/${submittedOrder.id}`} className="portal-btn portal-btn--primary">
                <MessageSquare size={16} /> Open Requirement & Chat with Sales Rep
              </Link>
            )}
            <button
              type="button"
              className="portal-btn portal-btn--outline"
              onClick={() => {
                setSubmittedOrder(null);
                setSelectedItems([]);
                setTitle('');
                setNotes('');
              }}
            >
              <Plus size={16} /> Submit Another Brief
            </button>
            <Link to="/portal/dashboard" className="portal-btn portal-btn--ghost">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-new-req-v2">
      {/* Executive Hero Banner */}
      <div className="portal-new-req-hero">
        <div className="portal-new-req-hero__left">
          <div className="portal-new-req-hero__icon-box">
            <Layers size={24} />
          </div>
          <div>
            <div className="portal-new-req-hero__chip-row">
              <span className="portal-hero-chip">
                <ShieldCheck size={13} /> {customer.tier || 'GOLD'} Account Privileges
              </span>
              <span className="portal-hero-chip emerald">
                <Clock size={13} /> Priority Response SLA &lt; 2h
              </span>
            </div>
            <h1>Create Procurement Requirement</h1>
            <p>
              Select items from our certified catalog to request custom volume pricing, payment term tailoring, and collaborative negotiations with your sales representative.
            </p>
          </div>
        </div>

        <div className="portal-new-req-hero__right">
          <div className="portal-sla-card">
            <div className="portal-sla-card__title">
              <Clock size={14} color="#059669" />
              <span>Fast-Track SLA Routing</span>
            </div>
            <div className="portal-sla-steps">
              <div className="portal-sla-step active">
                <span className="step-num">1</span>
                <span>Select Items</span>
              </div>
              <div className="portal-sla-divider" />
              <div className="portal-sla-step active">
                <span className="step-num">2</span>
                <span>AI Pricing</span>
              </div>
              <div className="portal-sla-divider" />
              <div className="portal-sla-step">
                <span className="step-num">3</span>
                <span>Official Quote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="portal-error-alert">
          <Info size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Main Workspace */}
      <form onSubmit={handleSubmit} className="portal-req-builder-layout">
        {/* LEFT COLUMN: Metadata & Product Catalog */}
        <div className="portal-req-builder-main">
          {/* Requirement Specifications Card */}
          <div className="portal-form-card">
            <div className="portal-form-card__header">
              <Tag size={18} color="#0F2C59" />
              <div>
                <h3>Requirement Specifications</h3>
                <p>Provide a project identifier and custom procurement terms</p>
              </div>
            </div>

            <div className="portal-form-group">
              <label>Requirement Title <span className="required">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q3 IT Infrastructure & Staff Equipment Refresh"
                className="portal-input-v2"
              />
            </div>

            <div className="portal-form-group">
              <label>Procurement Notes / Special Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify target delivery schedule, preferred billing cycle, packaging guidelines, etc."
                className="portal-textarea-v2"
                rows={3}
              />
              <div className="portal-tag-suggestions">
                <span className="tag-label">Quick tags:</span>
                <button type="button" onClick={() => appendNoteTag('Urgent Dispatch (under 48h)')}>
                  + Urgent Dispatch
                </button>
                <button type="button" onClick={() => appendNoteTag('Target Volume Discount: 15%')}>
                  + 15% Volume Discount
                </button>
                <button type="button" onClick={() => appendNoteTag('Net 30 Payment Terms')}>
                  + Net 30 Terms
                </button>
                <button type="button" onClick={() => appendNoteTag('Custom Corporate Branding')}>
                  + Corporate Branding
                </button>
              </div>
            </div>
          </div>

          {/* Product Catalog Card */}
          <div className="portal-catalog-card">
            <div className="portal-catalog-card__header">
              <div className="portal-catalog-card__title">
                <Package size={20} color="#0F2C59" />
                <div>
                  <h3>Select Catalog Items</h3>
                  <p>Browse certified enterprise products eligible for volume discount brackets</p>
                </div>
              </div>
              <span className="portal-catalog-count">
                {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''} Available
              </span>
            </div>

            {/* Catalog Filters Bar */}
            <div className="portal-catalog-controls">
              <div className="portal-search-v2">
                <Search size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog products by name, category, or specs..."
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="clear-btn">
                    ×
                  </button>
                )}
              </div>

              <div className="portal-cat-pills">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`portal-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="portal-products-grid-v2">
              {loadingProducts ? (
                <div className="portal-catalog-loading">
                  <div className="spinner" />
                  <p>Loading enterprise product catalog...</p>
                </div>
              ) : loadError ? (
                <div className="portal-catalog-error">
                  <p>{loadError}</p>
                  <button type="button" className="portal-btn portal-btn--sm portal-btn--outline" onClick={fetchProducts}>
                    Retry Catalog
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="portal-catalog-empty">
                  <Package size={36} color="#94a3b8" />
                  <p>No products match "{searchQuery}"</p>
                  <button type="button" className="portal-btn portal-btn--sm portal-btn--outline" onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}>
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const selected = selectedItems.find(i => i.productId === product.id);
                  const ProductIcon = getProductIcon(product);
                  const catStyle = getCategoryColor(product.category);

                  return (
                    <div 
                      key={product.id} 
                      className={`portal-product-card-v2 ${selected ? 'is-selected' : ''}`}
                    >
                      <div className="portal-product-card-v2__top">
                        <span 
                          className="portal-cat-badge"
                          style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                        >
                          {product.category || 'Standard'}
                        </span>
                        {selected && (
                          <span className="portal-added-indicator">
                            <Check size={12} /> Added
                          </span>
                        )}
                      </div>

                      <div className="portal-product-card-v2__hero">
                        <div className="portal-product-avatar">
                          <ProductIcon size={24} />
                        </div>
                        <div>
                          <h4 className="portal-product-name">{product.name}</h4>
                          <p className="portal-product-desc">
                            {product.description || 'Enterprise grade product with volume discount eligibility'}
                          </p>
                        </div>
                      </div>

                      <div className="portal-product-card-v2__footer">
                        <div className="portal-product-eligibility">
                          <span className="dot" />
                          <span>Volume Discount Eligible</span>
                        </div>

                        {selected ? (
                          <div className="portal-card-stepper">
                            <button 
                              type="button" 
                              onClick={() => updateQty(product.id, selected.quantity - 1)}
                              title="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="qty">{selected.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => updateQty(product.id, selected.quantity + 1)}
                              title="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                            <button 
                              type="button" 
                              className="remove-btn"
                              onClick={() => removeItem(product.id)}
                              title="Remove item"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            className="portal-add-item-btn"
                            onClick={() => addItem(product)}
                          >
                            <Plus size={14} /> Add to Brief
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Animated Analytics & Sticky Summary */}
        <div className="portal-req-builder-sidebar">
          {/* Animated Volume Discount Intelligence Graph */}
          <VolumeDiscountGraph totalUnits={totalUnits} />

          {/* Animated Category Composition Donut */}
          <CategoryDonutGraph selectedItems={selectedItems} />

          {/* Live Requirement Summary Card */}
          <div className="portal-summary-card">
            <div className="portal-summary-card__header">
              <div className="portal-summary-card__title">
                <ShoppingCart size={18} color="#0F2C59" />
                <span>Selected Line Items</span>
              </div>
              <span className="portal-summary-card__badge">
                {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="portal-summary-empty">
                <Package size={32} color="#94a3b8" />
                <p>No products selected yet</p>
                <span>Select products from the catalog to build your requirement brief</span>
              </div>
            ) : (
              <div className="portal-summary-items-list">
                {selectedItems.map(item => (
                  <div key={item.productId} className="portal-summary-item-row">
                    <div className="portal-summary-item-row__info">
                      <strong>{item.name}</strong>
                      <span className="cat">{item.category}</span>
                    </div>

                    <div className="portal-summary-item-row__stepper">
                      <button 
                        type="button" 
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="val">{item.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>
                      <button 
                        type="button" 
                        className="del"
                        onClick={() => removeItem(item.productId)}
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Units Tally */}
            <div className="portal-summary-tally">
              <div className="tally-row">
                <span>Total Quantity:</span>
                <strong>{totalUnits} Units</strong>
              </div>
              <div className="tally-row highlight">
                <span>Pricing Mode:</span>
                <strong style={{ color: '#059669' }}>Custom Volume Calculation</strong>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="portal-submit-btn"
            >
              {submitting ? (
                <>
                  <div className="spinner-sm" /> Submitting to Sales Desk...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Requirement Brief
                </>
              )}
            </button>
            <p className="portal-submit-disclaimer">
              <ShieldCheck size={12} /> Direct routing to your dedicated account manager under priority SLA.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
