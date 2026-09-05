import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { 
  Warehouse as WarehouseIcon, Package, Truck, CheckCircle2, 
  Split, RefreshCw, Layers, ArrowRight, MapPin, Building2,
  TrendingUp, ShieldCheck, User, Sparkles
} from 'lucide-react';

export default function WarehousePage() {
  const [searchParams] = useSearchParams();
  const quoteIdParam = searchParams.get('quoteId');

  const [warehouses, setWarehouses] = useState([]);
  const [approvedQuotes, setApprovedQuotes] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(quoteIdParam || '');
  const [selectedQuote, setSelectedQuote] = useState(null);
  
  // Split calculation state
  const [calculating, setCalculating] = useState(false);
  const [splitSimulation, setSplitSimulation] = useState(null);
  const [savingSplit, setSavingSplit] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Load initial warehouses and quotes
  const fetchData = async () => {
    try {
      const [whRes, qRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/quotations')
      ]);
      setWarehouses(whRes.data);
      
      const eligible = qRes.data.filter(q => ['APPROVED', 'SENT', 'CONFIRMED'].includes(q.status));
      setApprovedQuotes(eligible);

      if (quoteIdParam) {
        const q = qRes.data.find(x => x.id === quoteIdParam);
        if (q) {
          setSelectedQuoteId(q.id);
          setSelectedQuote(q);
        }
      } else if (eligible.length > 0) {
        setSelectedQuoteId(eligible[0].id);
        setSelectedQuote(eligible[0]);
      }
    } catch (err) {
      console.error('Failed to load warehouse data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quoteIdParam]);

  // When selected quote changes
  const handleQuoteChange = (id) => {
    setSelectedQuoteId(id);
    const q = approvedQuotes.find(x => x.id === id);
    setSelectedQuote(q || null);
    setSplitSimulation(null);
  };

  // Run Auto-Split Algorithm (Cheapest-First)
  const handleSimulateSplit = async () => {
    if (!selectedQuoteId) return;
    try {
      setCalculating(true);
      const res = await api.post(`/warehouses/split/${selectedQuoteId}`);
      setSplitSimulation(res.data);
      setFeedback({ type: 'info', message: 'Cheapest-first fulfillment split calculated.' });
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: 'Calculation error: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setCalculating(false);
    }
  };

  // Confirm Split and Lock Inventory
  const handleConfirmSplit = async () => {
    if (!splitSimulation) return;
    try {
      setSavingSplit(true);
      await api.post(`/warehouses/split/${selectedQuoteId}/save`, {
        splits: splitSimulation.splits
      });
      setFeedback({
        type: 'success',
        message: 'Warehouse split confirmed! Stock deducted and fulfillment orders dispatched.'
      });
      fetchData(); // refresh stock counts
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: 'Confirmation failed: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setSavingSplit(false);
    }
  };

  // Summary KPIs for network strip
  const totalWarehouses = warehouses.length;
  const totalUnits = warehouses.reduce((sum, wh) => sum + (wh.stockLevels?.reduce((acc, s) => acc + s.quantity, 0) || 0), 0);
  const totalSkus = new Set(warehouses.flatMap(wh => wh.stockLevels?.map(s => s.productId) || [])).size;
  const avgCostWeight = warehouses.length > 0
    ? (warehouses.reduce((sum, wh) => sum + Number(wh.shippingCostWeight || 1), 0) / warehouses.length).toFixed(1)
    : '1.0';

  return (
    <div className="warehouse-container">
      {/* Header */}
      <div className="warehouse-header-modern">
        <div className="wh-header-content">
          <div className="wh-header-icon-box">
            <WarehouseIcon size={24} />
          </div>
          <div className="wh-header-titles">
            <h2>Multi-Warehouse Operations</h2>
            <p>Real-time stock monitoring & optimal cheapest-first fulfillment routing.</p>
          </div>
        </div>
        <div className="wh-header-actions">
          <span className="wh-telemetry-badge">
            <span className="wh-telemetry-dot" /> Live Stock Mesh Active
          </span>
          <button className="btn btn-outline-primary" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh Stock
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Network Quick KPI Strip */}
      <div className="wh-network-strip">
        <div className="wh-network-stat-card">
          <div className="wh-net-stat-icon blue">
            <Building2 size={22} />
          </div>
          <div className="wh-net-stat-data">
            <span className="wh-net-stat-val">{totalWarehouses}</span>
            <span className="wh-net-stat-lbl">Active Fulfillment Nodes</span>
          </div>
        </div>
        <div className="wh-network-stat-card">
          <div className="wh-net-stat-icon green">
            <Package size={22} />
          </div>
          <div className="wh-net-stat-data">
            <span className="wh-net-stat-val">{totalUnits.toLocaleString()}</span>
            <span className="wh-net-stat-lbl">Network Stock Units</span>
          </div>
        </div>
        <div className="wh-network-stat-card">
          <div className="wh-net-stat-icon amber">
            <Layers size={22} />
          </div>
          <div className="wh-net-stat-data">
            <span className="wh-net-stat-val">{totalSkus}</span>
            <span className="wh-net-stat-lbl">Catalog SKUs Tracked</span>
          </div>
        </div>
        <div className="wh-network-stat-card">
          <div className="wh-net-stat-icon purple">
            <TrendingUp size={22} />
          </div>
          <div className="wh-net-stat-data">
            <span className="wh-net-stat-val">{avgCostWeight}x</span>
            <span className="wh-net-stat-lbl">Avg Transit Cost Multiplier</span>
          </div>
        </div>
      </div>

      {/* Warehouses Overview Grid */}
      <div className="warehouse-cards-grid">
        {warehouses.map(wh => {
          const totalUnitsInWh = wh.stockLevels?.reduce((acc, s) => acc + s.quantity, 0) || 0;
          const costWeight = Number(wh.shippingCostWeight || 1);
          const weightClass = costWeight <= 1.0 ? 'weight-opt' : costWeight <= 1.2 ? 'weight-mid' : 'weight-high';

          return (
            <div key={wh.id} className="wh-kpi-card">
              <div className="wh-card-top">
                <div className="wh-title">
                  <div className="wh-avatar">
                    <Building2 size={20} />
                  </div>
                  <div className="wh-meta">
                    <strong>{wh.name}</strong>
                    <div className="wh-loc">
                      <MapPin size={12} />
                      <span>{wh.location || 'Regional Fulfillment Node'}</span>
                    </div>
                  </div>
                </div>
                <span className={`wh-weight-chip ${weightClass}`}>
                  {costWeight.toFixed(1)}x Weight
                </span>
              </div>

              {/* Metrics Tile */}
              <div className="wh-metrics-tiles">
                <div className="wh-metric-tile">
                  <span className="wh-metric-val">{totalUnitsInWh.toLocaleString()}</span>
                  <span className="wh-metric-lbl">Units In Stock</span>
                </div>
                <div className="wh-metric-tile">
                  <span className="wh-metric-val">{wh.stockLevels?.length || 0}</span>
                  <span className="wh-metric-lbl">SKUs Stocked</span>
                </div>
              </div>

              {/* SKUs Preview Chips */}
              {wh.stockLevels && wh.stockLevels.length > 0 && (
                <div className="wh-skus-preview">
                  {wh.stockLevels.slice(0, 3).map(s => (
                    <span key={s.id} className="wh-sku-tag">
                      {s.product?.name || 'SKU'}: <strong>{s.quantity}</strong>
                    </span>
                  ))}
                  {wh.stockLevels.length > 3 && (
                    <span className="wh-sku-tag">+{wh.stockLevels.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Split Allocation Workspace */}
      <div className="warehouse-split-section">
        <div className="split-section-header">
          <div className="split-title-group">
            <h3><Split size={20} /> Automated Fulfillment Split</h3>
            <p>Select an approved quote to route items to the most cost-effective regional warehouse.</p>
          </div>

          <div className="quote-select-control">
            <label className="field-label">Target Quotation</label>
            <select
              className="form-control"
              value={selectedQuoteId}
              onChange={(e) => handleQuoteChange(e.target.value)}
            >
              <option value="">-- Choose Quotation --</option>
              {approvedQuotes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.quoteNumber} — {q.customer?.name} ({formatCurrency(q.totalAmount)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedQuote && (
          <div className="split-quote-preview">
            <div className="quote-meta-ribbon">
              <div className="quote-ribbon-item">
                <User size={15} color="#0F2C59" />
                <span>Customer: <strong>{selectedQuote.customer?.name}</strong></span>
              </div>
              <div className="quote-ribbon-sep" />
              <div className="quote-ribbon-item">
                <ShieldCheck size={15} color="#059669" />
                <span>Status: <strong className="badge badge-success" style={{ marginLeft: '4px' }}>{selectedQuote.status}</strong></span>
              </div>
              <div className="quote-ribbon-sep" />
              <div className="quote-ribbon-item">
                <span>Total Value: <strong className="font-mono text-navy font-bold">{formatCurrency(selectedQuote.totalAmount)}</strong></span>
              </div>
              <div className="quote-ribbon-sep" />
              <div className="quote-ribbon-item">
                <span>Dispatch Items: <strong>{selectedQuote.lines?.length || 0} Products</strong></span>
              </div>
            </div>

            <h4 className="section-subheading-clean">Items Requiring Regional Dispatch:</h4>
            <div className="split-table-wrapper">
              <table className="split-dispatch-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Quantity Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuote.lines?.map(l => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.product?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.product?.sku}</div>
                      </td>
                      <td><span className="cat-tag-pill">{l.product?.category}</span></td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-bold text-navy">{l.quantity} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="split-action-bar">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSimulateSplit}
                disabled={calculating}
                style={{ borderRadius: '12px', padding: '12px 24px' }}
              >
                {calculating ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Computing Optimal Routing...
                  </>
                ) : (
                  <>
                    <Truck size={17} /> Run Cheapest-First Split Algorithm
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Split Algorithm Result */}
        {splitSimulation && (
          <div className="split-result-box">
            <div className="split-result-header">
              <div className="split-result-header-icon">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4>Optimal Fulfillment Route Computed</h4>
                <p>Items distributed across warehouses to minimize delivery transit cost:</p>
              </div>
            </div>

            <div className="split-table-wrapper">
              <table className="split-dispatch-table">
                <thead>
                  <tr>
                    <th>Fulfillment Warehouse</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Fulfilled Qty</th>
                    <th style={{ textAlign: 'right' }}>Backorder Qty</th>
                    <th style={{ textAlign: 'center' }}>Routing Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {splitSimulation.splits?.map((s, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <WarehouseIcon size={15} color="#0F2C59" />
                          <strong>{s.warehouseName}</strong>
                        </div>
                      </td>
                      <td>{s.productName}</td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-bold text-success">
                        {s.quantityFulfilled} units
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono text-danger">
                        {s.quantityBackordered || 0}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          Transit Optimal
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="confirm-split-footer">
              <button
                className="btn btn-success btn-lg"
                onClick={handleConfirmSplit}
                disabled={savingSplit}
                style={{ borderRadius: '12px', padding: '12px 24px' }}
              >
                {savingSplit ? 'Allocating & Decrementing...' : 'Lock Allocation & Deduct Stock'}
                {!savingSplit && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
