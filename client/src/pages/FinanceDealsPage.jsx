import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { 
  FileCheck, CreditCard, CheckCircle2, Clock, Building2, 
  User, RefreshCw, FileText, Search, ArrowRight, 
  ShieldCheck, TrendingUp, Layers, Receipt, Zap, Download, ExternalLink
} from 'lucide-react';

export default function FinanceDealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(null); // quotationId being processed
  const [downloading, setDownloading] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '', quotationId: null, quoteNumber: null });

  const fetchApprovedDeals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations?status=APPROVED,CONFIRMED');
      setDeals(res.data);
    } catch (err) {
      console.error('Failed to load approved deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedDeals();
    // Listen for live approval events
    const handleApproved = () => fetchApprovedDeals();
    window.addEventListener('df360:quotation:approved', handleApproved);
    return () => window.removeEventListener('df360:quotation:approved', handleApproved);
  }, []);

  const downloadInvoicePdf = async (quotationId, quoteNumber) => {
    try {
      setDownloading(quotationId);
      const response = await api.get(`/billing/pdf/${quotationId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `DealFlow360-Invoice-${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      setFeedback({
        type: 'danger',
        message: 'Could not download PDF invoice: ' + (err.response?.data?.error || err.message),
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateInvoice = async (quotationId, quoteNumber) => {
    try {
      setGenerating(quotationId);
      // 1. Post to billing generate to issue invoice records in DB & generate PDF
      await api.post(`/billing/generate/${quotationId}`);

      // 2. Automatically download the generated PDF to user's computer
      await downloadInvoicePdf(quotationId, quoteNumber);

      setFeedback({
        type: 'success',
        message: `Official tax invoice & PDF generated and downloaded for ${quoteNumber}!`,
        quotationId,
        quoteNumber,
      });
      fetchApprovedDeals();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: 'Invoice generation failed: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setGenerating(null);
    }
  };

  // Aggregates
  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + Number(d.orderTotal || 0), 0);
  const totalMargin = deals.reduce((sum, d) => sum + Number(d.totalMargin || 0), 0);
  const avgMarginPct = totalValue > 0 ? ((totalMargin / totalValue) * 100).toFixed(1) : 0;
  const pendingInvoicing = deals.filter(d => !d.invoices || d.invoices.length === 0).length;

  // Search filter
  const filtered = deals.filter(d => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    const qNum = (d.quoteNumber || '').toLowerCase();
    const cName = (d.customer?.name || '').toLowerCase();
    const cComp = (d.customer?.company || '').toLowerCase();
    const rName = (d.rep?.name || '').toLowerCase();
    return qNum.includes(s) || cName.includes(s) || cComp.includes(s) || rName.includes(s);
  });

  return (
    <div className="approvals-container">
      {/* Header */}
      <div className="approvals-header-modern">
        <div className="approvals-header-left">
          <div className="approvals-header-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <FileCheck size={26} />
          </div>
          <div className="approvals-header-text">
            <h2>Authorized Deals — Ready for Execution</h2>
            <p>Manager-approved quotations ready for invoicing, e-sign, and payment processing.</p>
          </div>
        </div>

        <div className="approvals-header-actions">
          <span className="wh-telemetry-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
            <span className="wh-telemetry-dot" style={{ background: '#10b981' }} /> Finance Execution Mode
          </span>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchApprovedDeals} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="approvals-kpi-grid">
        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Authorized Deals</span>
            <div className="approvals-kpi-value">{totalDeals}</div>
            <span className="approvals-kpi-sub">Ready for invoicing</span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box navy">
            <TrendingUp size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Total Deal Value</span>
            <div className="approvals-kpi-value">{formatCurrency(totalValue)}</div>
            <span className="approvals-kpi-sub">Approved pipeline</span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box amber">
            <Layers size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Gross Margin</span>
            <div className="approvals-kpi-value">{formatCurrency(totalMargin)}</div>
            <span className="approvals-kpi-sub">{avgMarginPct}% blended margin</span>
          </div>
        </div>

        <div className="approvals-kpi-card">
          <div className="approvals-kpi-icon-box rose">
            <Receipt size={22} />
          </div>
          <div className="approvals-kpi-data">
            <span className="approvals-kpi-label">Pending Invoicing</span>
            <div className="approvals-kpi-value">{pendingInvoicing}</div>
            <span className="approvals-kpi-sub">Awaiting finance execution</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="approvals-controls-bar">
        <div className="approvals-search-box">
          <Search size={16} color="#64748b" />
          <input 
            type="text"
            placeholder="Search by quote #, client, rep, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Alert */}
      {feedback.message && (
        <div className={`alert-banner alert-banner-${feedback.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span>{feedback.message}</span>
          {feedback.quotationId && (
            <button
              className="btn btn-sm"
              onClick={() => downloadInvoicePdf(feedback.quotationId, feedback.quoteNumber)}
              disabled={downloading === feedback.quotationId}
              style={{ background: '#fff', color: '#059669', border: '1px solid #10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '6px' }}
            >
              <Download size={13} /> {downloading === feedback.quotationId ? 'Downloading...' : 'Re-download PDF'}
            </button>
          )}
        </div>
      )}

      {/* Deal Cards */}
      {filtered.length === 0 && !loading ? (
        <div className="card empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(15,44,89,0.08)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileCheck size={32} />
          </div>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0F2C59', fontSize: '1.3rem', marginBottom: '8px' }}>
            No Authorized Deals Awaiting Execution
          </h3>
          <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem' }}>
            When Sales Managers authorize quotations, they'll appear here for invoicing and payment processing.
          </p>
        </div>
      ) : (
        <div className="approval-cards-grid-modern">
          {filtered.map(deal => {
            const netVal = Number(deal.orderTotal || 0);
            const marginVal = Number(deal.totalMargin || 0);
            const marginPct = netVal > 0 ? ((marginVal / netVal) * 100).toFixed(1) : 0;
            const clientName = deal.customer?.company || deal.customer?.name || 'Client';
            const initials = clientName
              .split(' ')
              .map(word => word[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const quoteNumber = deal.quoteNumber || `QT-${deal.id.slice(-6).toUpperCase()}`;

            return (
              <div key={deal.id} className="approval-card-modern">
                {/* Card Header */}
                <div className="ticket-header-modern">
                  <div className="ticket-badges-group">
                    <span className="ticket-quote-id">{quoteNumber}</span>
                    {deal.status === 'CONFIRMED' ? (
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', fontWeight: 700 }}>
                        <ShieldCheck size={12} color="#059669" /> ODOO SIGNED
                      </span>
                    ) : (
                      <span className="badge badge-success">APPROVED</span>
                    )}
                  </div>
                  <span className="ticket-date-modern">
                    <Clock size={13} /> {formatDate(deal.lastActivityAt || deal.createdAt)}
                  </span>
                </div>

                {/* Client Info */}
                <div className="ticket-client-hero">
                  <div className="ticket-client-left">
                    <div className="ticket-avatar" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                      {initials}
                    </div>
                    <div className="ticket-client-details">
                      <h4>{deal.customer?.name || 'Customer'}</h4>
                      <span>{deal.customer?.company || 'Corporate Client'}</span>
                    </div>
                  </div>
                  <span className={`badge badge-sm ${getStatusBadgeClass(deal.customer?.tier || 'BRONZE')}`}>
                    {deal.customer?.tier || 'STANDARD'} TIER
                  </span>
                </div>

                {/* Financial Matrix */}
                <div className="ticket-financial-matrix">
                  <div className="matrix-cell">
                    <span className="matrix-label">Deal Value</span>
                    <span className="matrix-val">{formatCurrency(netVal)}</span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Gross Margin</span>
                    <span className="matrix-val success">{formatCurrency(marginVal)}</span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Margin %</span>
                    <span className="matrix-val success">{marginPct}%</span>
                  </div>

                  <div className="matrix-cell">
                    <span className="matrix-label">Terms</span>
                    <span className="matrix-val">{deal.paymentTerms || 'Net 30'}</span>
                  </div>
                </div>

                {/* Sales Rep */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                  <User size={14} color="#0F2C59" />
                  <span>Sales Rep: <strong style={{ color: '#0F2C59' }}>{deal.rep?.name || 'Sales Representative'}</strong></span>
                </div>

                {/* Approved / Signed Status Banner */}
                <div className="ticket-escalation-banner" style={{ background: deal.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', color: '#065f46' }}>
                  <ShieldCheck size={16} style={{ flexShrink: 0, color: '#059669' }} />
                  <span>
                    {deal.status === 'CONFIRMED'
                      ? `Digitally signed via Odoo Sign Protocol by ${deal.customer?.name}. Commercial terms certified.`
                      : 'Manager-authorized. Ready for customer execution & invoice issuance.'}
                  </span>
                </div>

                {/* Action Bar - No Approve/Reject, only Execute & PDF Download */}
                <div className="ticket-actions-modern">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                    <FileText size={14} />
                    <span>{deal.lines?.length || 0} line items</span>
                    {deal.invoices && deal.invoices.length > 0 && (
                      <span style={{ marginLeft: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600, fontSize: '0.72rem' }}>
                        Invoiced
                      </span>
                    )}
                  </div>

                  <div className="ticket-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {deal.invoices && deal.invoices.length > 0 && (
                      <button
                        className="btn btn-sm"
                        onClick={() => downloadInvoicePdf(deal.id, quoteNumber)}
                        disabled={downloading === deal.id}
                        title="Download official PDF invoice"
                        style={{ background: '#ffffff', color: '#0F2C59', border: '1px solid #cbd5e1', fontWeight: 600, borderRadius: '10px', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                      >
                        <Download size={14} color="#059669" />
                        {downloading === deal.id ? 'Downloading...' : 'Download PDF'}
                      </button>
                    )}
                    <button
                      className="btn-approve-modern"
                      onClick={() => handleGenerateInvoice(deal.id, quoteNumber)}
                      disabled={generating === deal.id || downloading === deal.id}
                      style={{ borderRadius: '10px' }}
                    >
                      <CreditCard size={14} />
                      {generating === deal.id ? 'Generating PDF...' : (deal.invoices && deal.invoices.length > 0 ? 'Regenerate Invoice' : 'Generate Invoice')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
