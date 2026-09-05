import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import { Plus, Minus, Send, Package, Search, X } from 'lucide-react';

export default function PortalNewRequirement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ productId, quantity, name, category }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');

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

  const categories = ['ALL', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addItem = (product) => {
    const existing = selectedItems.find(i => i.productId === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        quantity: 1,
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
      await portalApi.post('/portal/requirements', {
        title: title.trim(),
        notes: notes.trim(),
        desiredItems: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit requirement');
    } finally {
      setSubmitting(false);
    }
  };

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
                <div key={item.productId} className="portal-selected-item">
                  <span className="portal-selected-item__name">{item.name}</span>
                  <span className="portal-selected-item__cat">{item.category}</span>
                  <span className="portal-selected-item__qty">×{item.quantity}</span>
                  <button type="button" onClick={() => removeItem(item.productId)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
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
