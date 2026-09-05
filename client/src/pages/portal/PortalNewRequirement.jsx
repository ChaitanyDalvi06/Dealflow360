import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import { Plus, Minus, Send, Package, Search, X, Sparkles, CheckCircle, MessageSquare } from 'lucide-react';

export default function PortalNewRequirement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ productId, quantity, name, category }]
  const [upsellRecs, setUpsellRecs] = useState([]);
  const [recQuantities, setRecQuantities] = useState({});
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');

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
      setLoadError('Failed to load catalog products. Please try again.');
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

  const categories = ['ALL', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a title for your requirement');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please select at least one product');
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
      setError(err.response?.data?.error || 'Failed to submit requirement');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedOrder) {
    return (
      <div className="portal-new-req" style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={30} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Order / Requirement Submitted Successfully!</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                Your requirement <strong>"{submittedOrder.title}"</strong> has been queued. A dedicated sales representative will review your terms shortly.
              </p>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Ordered Items ({submittedOrder.items.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {submittedOrder.items.map((it, idx) => (
                <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={14} color="#64748b" />
                  <strong>{it.name || it.productId}</strong>
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>×{it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model 1: Immediately Visible Post-Order Complementary Recommendations */}
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1.5px solid #a7f3d0', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#065f46', fontWeight: 700 }}>
                  Frequently Bought Together (Model 1 Complementary Add-ons)
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                Post-Order Recommendations
              </span>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#047857' }}>
              Buyers who placed an order for <strong>{submittedOrder.items.map(i => i.name).filter(Boolean).join(', ') || 'these items'}</strong> also frequently added these complementary products:
            </p>

            {submittedOrder.recommendations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {submittedOrder.recommendations.map(rec => (
                  <div key={rec.id} style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{rec.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                        {rec.category} • ₹{Number(rec.basePrice || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '6px', fontWeight: 500 }}>
                        {rec.reason || `${rec.lift || rec.liftScore}x lift affinity`}
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                        {rec.lift || rec.liftScore}x Lift
                      </span>
                      <button
                        type="button"
                        className="portal-btn portal-btn--sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        onClick={() => {
                          setSubmittedOrder(null);
                          setSelectedItems([{ productId: rec.id, quantity: 1, name: rec.name, category: rec.category }]);
                          setTitle(`Add-on: ${rec.name}`);
                          setNotes(`Complementary add-on request for requirement "${submittedOrder.title}"`);
                        }}
                      >
                        + Add to New Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Evaluating catalog pairings for your order...</p>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {submittedOrder.id && (
              <Link to={`/portal/requirement/${submittedOrder.id}`} className="portal-btn portal-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <MessageSquare size={16} /> View Requirement & Chat with Sales Rep
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setSubmittedOrder(null);
                setSelectedItems([]);
                setTitle('');
                setNotes('');
              }}
              className="portal-btn portal-btn--secondary"
            >
              <Plus size={16} /> Submit Another Requirement
            </button>
            <Link to="/portal/dashboard" className="portal-btn portal-btn--outline" style={{ textDecoration: 'none' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-new-req">
      <h1>New Requirement</h1>
      <p className="portal-new-req__subtitle">Select products from our catalog and submit your requirement. A sales representative will be assigned to help you.</p>

      {error && <div className="portal-alert portal-alert--danger">{error}</div>}

      <form onSubmit={handleSubmit} className="portal-new-req__form">
        {/* Title & Notes */}
        <div className="portal-form-group">
          <label>Requirement Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q3 IT Infrastructure Refresh"
            className="portal-input"
          />
        </div>

        <div className="portal-form-group">
          <label>Notes / Special Instructions</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific requirements, delivery timeline, etc."
            className="portal-textarea"
            rows={3}
          />
        </div>

        {/* Product Catalog */}
        <div className="portal-catalog">
          <h2>Product Catalog</h2>
          <div className="portal-catalog__filters">
            <div className="portal-search">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
              />
            </div>
            <div className="portal-category-tabs">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`portal-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="portal-catalog__grid">
            {loadingProducts ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#666', gridColumn: '1 / -1' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p>Loading available catalog products...</p>
              </div>
            ) : loadError ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626', gridColumn: '1 / -1' }}>
                <p style={{ marginBottom: '10px' }}>{loadError}</p>
                <button type="button" className="portal-btn portal-btn--sm" onClick={fetchProducts}>
                  Retry Loading
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#888', gridColumn: '1 / -1' }}>
                No products found matching "{searchQuery}"
              </div>
            ) : (
              filteredProducts.map(product => {
                const selected = selectedItems.find(i => i.productId === product.id);
                return (
                  <div key={product.id} className={`portal-product-card ${selected ? 'portal-product-card--selected' : ''}`}>
                    <div className="portal-product-card__info">
                      <Package size={16} />
                      <div>
                        <h4>{product.name}</h4>
                        <span className="portal-product-card__category">{product.category}</span>
                        {product.description && <p className="portal-product-card__desc">{product.description}</p>}
                      </div>
                    </div>
                    {selected ? (
                      <div className="portal-product-card__qty">
                        <button type="button" onClick={() => updateQty(product.id, selected.quantity - 1)}>
                          <Minus size={14} />
                        </button>
                        <span>{selected.quantity}</span>
                        <button type="button" onClick={() => updateQty(product.id, selected.quantity + 1)}>
                          <Plus size={14} />
                        </button>
                        <button type="button" className="portal-product-card__remove" onClick={() => removeItem(product.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="portal-btn portal-btn--sm" onClick={() => addItem(product)}>
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Items Summary */}
        {selectedItems.length > 0 && (
          <div className="portal-selected-summary">
            <h3>Selected Items ({selectedItems.length})</h3>
            <div className="portal-selected-list">
              {selectedItems.map(item => (
                <div key={item.productId} className="portal-selected-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#0F2C59" />
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{item.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>({item.category})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', overflow: 'hidden' }}>
                      <button
                        type="button"
                        style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        title="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQty(item.productId, Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ width: '44px', border: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', background: 'transparent' }}
                      />
                      <button
                        type="button"
                        style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        title="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Remove item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model 1: AI Recommended Complementary Add-ons */}
        {upsellRecs.length > 0 && (
          <div style={{
            margin: '24px 0',
            padding: '20px 22px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(15, 44, 89, 0.04) 0%, rgba(15, 44, 89, 0.01) 100%)',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#0F2C59" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0F2C59', fontWeight: 700 }}>
                  Frequently Bought Together (Recommended Complementary Add-ons)
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Model 1 AI Engine
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px 0' }}>
              AI Market Basket analysis identified these items as high-value additions. Choose your desired quantity and add directly to your requirement:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {upsellRecs.map(rec => {
                const selected = selectedItems.find(i => i.productId === rec.id);
                const currentRecQty = getRecQty(rec.id);

                return (
                  <div key={rec.id} style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: selected ? '#f0fdf4' : '#fff',
                    border: selected ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>{rec.name}</strong>
                        {rec.lift && (
                          <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {rec.lift}x affinity
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '4px' }}>{rec.reason}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                        Base: ₹{Number(rec.basePrice || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px' }}>
                        {rec.category}
                      </span>

                      {selected ? (
                        /* Already Added State: Show Added Badge & Stepper to Increase/Decrease */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                            Added:
                          </span>
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #86efac', borderRadius: '6px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#334155' }}
                              onClick={() => updateQty(rec.id, selected.quantity - 1)}
                              title="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={selected.quantity}
                              onChange={(e) => updateQty(rec.id, Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: '42px', border: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', padding: '2px 0' }}
                            />
                            <button
                              type="button"
                              style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#334155' }}
                              onClick={() => updateQty(rec.id, selected.quantity + 1)}
                              title="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Not Yet Added State: Quantity Selector + Add Button */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              style={{ border: 'none', background: 'transparent', padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                              onClick={() => setRecQty(rec.id, currentRecQty - 1)}
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={currentRecQty}
                              onChange={(e) => setRecQty(rec.id, e.target.value)}
                              style={{ width: '38px', border: 'none', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', background: 'transparent', padding: '2px 0' }}
                            />
                            <button
                              type="button"
                              style={{ border: 'none', background: 'transparent', padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                              onClick={() => setRecQty(rec.id, currentRecQty + 1)}
                              title="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="portal-btn portal-btn--sm"
                            onClick={() => addItem({ id: rec.id, name: rec.name, category: rec.category }, currentRecQty)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={14} /> Add ({currentRecQty})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" className="portal-btn portal-btn--primary portal-btn--lg" disabled={submitting}>
          <Send size={16} />
          {submitting ? 'Submitting...' : 'Submit Requirement'}
        </button>
      </form>
    </div>
  );
}
