import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { 
  Warehouse as WarehouseIcon, Package, Truck, CheckCircle, 
  Split, RefreshCw, AlertTriangle, Layers, ArrowRight
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

  return (
    <div className="warehouse-container">
      {/* Header */}
      <div className="warehouse-header card">
        <div className="header-info">
          <h2><WarehouseIcon size={24} /> Multi-Warehouse Operations</h2>
          <p>Real-time stock monitoring & optimal cheapest-first fulfillment routing.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={15} /> Refresh Stock
        </button>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Warehouses Overview Grid */}
      <div className="warehouse-cards-grid">
        {warehouses.map(wh => {
          const totalUnits = wh.stockLevels?.reduce((acc, s) => acc + s.quantity, 0) || 0;
          return (
            <div key={wh.id} className="card wh-kpi-card">
              <div className="wh-card-top">
                <div className="wh-title">
                  <Package size={20} className="wh-icon" />
                  <div>
                    <strong>{wh.name}</strong>
                    <div className="wh-loc">{wh.location || 'Fulfillment Node'}</div>
                  </div>
                </div>
                <span className="badge badge-info">Cost Weight: {Number(wh.shippingCostWeight).toFixed(1)}x</span>
              </div>
              <div className="wh-stat-row">
                <div className="wh-stat">
                  <span className="wh-stat-val font-mono">{totalUnits}</span>
                  <span className="wh-stat-lbl">Units In Stock</span>
                </div>
                <div className="wh-stat">
                  <span className="wh-stat-val font-mono">{wh.stockLevels?.length || 0}</span>
                  <span className="wh-stat-lbl">SKUs Stocked</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Split Allocation Workspace */}
      <div className="warehouse-split-section card">
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
            <div className="quote-mini-details">
              <span>Customer: <strong>{selectedQuote.customer?.name}</strong></span>
              <span>Status: <strong className="text-success">{selectedQuote.status}</strong></span>
              <span>Total Value: <strong className="font-mono">{formatCurrency(selectedQuote.totalAmount)}</strong></span>
            </div>

            <h4 className="section-subheading">Items Requiring Dispatch:</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity Needed</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.lines?.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.product?.name}</strong> <small>({l.product?.sku})</small></td>
                    <td><span className="badge badge-sm">{l.product?.category}</span></td>
                    <td className="font-mono font-bold">{l.quantity} units</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="split-action-bar">
              <button
                className="btn btn-primary"
                onClick={handleSimulateSplit}
                disabled={calculating}
              >
                {calculating ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Computing Optimal Routing...
                  </>
                ) : (
                  <>
                    <Truck size={16} /> Run Cheapest-First Split Algorithm
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
              <CheckCircle size={22} color="#28a745" />
              <div>
                <h4>Optimal Fulfillment Route Computed</h4>
                <p>Items distributed across warehouses to minimize delivery transit cost:</p>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Fulfillment Warehouse</th>
                  <th>Product</th>
                  <th>Fulfilled Qty</th>
                  <th>Backorder Qty</th>
                  <th>Routing Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {splitSimulation.splits?.map((s, idx) => (
                  <tr key={idx}>
                    <td>
                      <WarehouseIcon size={14} /> <strong>{s.warehouseName}</strong>
                    </td>
                    <td>{s.productName}</td>
                    <td className="font-mono font-bold text-success">{s.quantityFulfilled} units</td>
                    <td className="font-mono text-danger">{s.quantityBackordered || 0}</td>
                    <td>
                      <span className="badge badge-success">Optimized</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="confirm-split-footer">
              <button
                className="btn btn-success btn-lg"
                onClick={handleConfirmSplit}
                disabled={savingSplit}
              >
                {savingSplit ? 'Allocating & Decrementing...' : 'Lock Allocation & Deduct Stock'}
                {!savingSplit && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
