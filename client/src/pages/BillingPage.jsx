import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { 
  CreditCard, FileText, CheckCircle, Clock, AlertCircle, 
  DollarSign, Plus, RefreshCw, Layers
} from 'lucide-react';

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(null); // { invoice }
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await api.get('/billing/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleRecordPayment = async () => {
    if (!paymentModal) return;
    try {
      setRecording(true);
      await api.post('/billing/payments', {
        invoiceId: paymentModal.id,
        amount: Number(paymentModal.amountDue || paymentModal.totalAmount),
        paymentMethod,
        transactionRef: transactionRef || `TXN-${Date.now().toString().slice(-6)}`
      });
      setFeedback({ type: 'success', message: `Payment recorded for Invoice #${paymentModal.invoiceNumber}!` });
      setPaymentModal(null);
      setTransactionRef('');
      fetchBilling();
    } catch (err) {
      setFeedback({ type: 'danger', message: 'Payment record failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setRecording(false);
    }
  };

  // Financial aggregates
  const totalBilled = invoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  return (
    <div className="billing-container">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-navy">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Invoiced</div>
            <div className="kpi-value font-mono">{formatCurrency(totalBilled)}</div>
            <div className="kpi-meta">{invoices.length} invoices generated</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-success">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Collected</div>
            <div className="kpi-value font-mono">{formatCurrency(totalPaid)}</div>
            <div className="kpi-meta">Reconciled in bank</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-warning">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Outstanding Receivables</div>
            <div className="kpi-value font-mono">{formatCurrency(totalOutstanding)}</div>
            <div className="kpi-meta">Due within payment terms</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-info">
            <Layers size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Hybrid Billing Rule</div>
            <div className="kpi-value">Active</div>
            <div className="kpi-meta">1-Time + Recurring split</div>
          </div>
        </div>
      </div>

      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Invoices Table Card */}
      <div className="card billing-table-card">
        <div className="table-card-header">
          <div className="title-group">
            <h3><FileText size={20} /> Invoices & Subscriptions</h3>
            <p>Automated split billing: separate invoices for one-time setup vs recurring SaaS schedules.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchBilling}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {invoices.length === 0 && !loading ? (
          <div className="empty-state">
            <CreditCard size={44} className="empty-icon" />
            <h4>No invoices generated yet</h4>
            <p>When quotations are confirmed by customer or sales reps, hybrid invoices appear here.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table billing-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <span className="font-mono font-bold">{inv.invoiceNumber}</span>
                      {inv.quotation && <div className="text-muted"><small>Ref: {inv.quotation.quoteNumber}</small></div>}
                    </td>
                    <td>
                      <strong>{inv.customer?.name}</strong>
                      <div className="text-muted"><small>{inv.customer?.company}</small></div>
                    </td>
                    <td>
                      <span className={`badge ${inv.invoiceType === 'RECURRING' ? 'badge-primary' : 'badge-secondary'}`}>
                        {inv.invoiceType || 'ONE_TIME'}
                      </span>
                    </td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="font-mono font-bold">{formatCurrency(inv.totalAmount)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      {inv.status !== 'PAID' ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setPaymentModal(inv)}
                        >
                          <CreditCard size={14} /> Record Pay
                        </button>
                      ) : (
                        <span className="text-success"><CheckCircle size={16} /> Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Invoice Payment</h3>
              <button className="btn-close" onClick={() => setPaymentModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="payment-modal-info">
                <div>Invoice: <strong>{paymentModal.invoiceNumber}</strong></div>
                <div>Customer: <strong>{paymentModal.customer?.name}</strong></div>
                <div>Amount Due: <strong className="text-navy font-mono">{formatCurrency(paymentModal.totalAmount)}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Channel</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                  <option value="UPI">UPI (Unified Payments Interface)</option>
                  <option value="CREDIT_CARD">Corporate Credit Card</option>
                  <option value="CHECK">Demand Draft / Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference Number</label>
                <input
                  type="text"
                  className="form-control font-mono"
                  placeholder="e.g. UTR1298471203"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPaymentModal(null)}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={handleRecordPayment}
                disabled={recording}
              >
                {recording ? 'Recording...' : 'Confirm Receipt & Reconcile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
