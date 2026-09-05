import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  ShieldCheck, FileText, CheckCircle, MessageSquare, Send, 
  PenTool, Download, AlertCircle, Check, Sparkles
} from 'lucide-react';

export default function PortalQuotePage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Negotiation state
  const [counterDiscount, setCounterDiscount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [negotiating, setNegotiating] = useState(false);
  const [negotiationSuccess, setNegotiationSuccess] = useState('');

  // E-Sign state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerDesignation, setSignerDesignation] = useState('Director of Procurement');
  const [signatureType, setSignatureType] = useState('TYPE'); // 'TYPE' or 'DRAW'
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  // Canvas ref for drawing signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const fetchPortalQuote = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/portal/quote/${token}`);
        setQuote(res.data);
        if (res.data.customer?.name) {
          setSignerName(res.data.customer.name);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load quotation. Invalid or expired token.');
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchPortalQuote();
    }
  }, [token]);

  // Handle Counter Offer / Negotiation
  const handleNegotiateSubmit = async (e) => {
    e.preventDefault();
    try {
      setNegotiating(true);
      const res = await api.post(`/portal/quote/${token}/negotiate`, {
        counterDiscountPct: Number(counterDiscount) || 0,
        message: counterMessage
      });
      setNegotiationSuccess('Your counter-offer has been routed to the account management team for review.');
      setQuote(res.data.quotation || quote);
    } catch (err) {
      alert('Negotiation request failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setNegotiating(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Submit E-Signature
  const handleSignConfirm = async () => {
    if (!signerName.trim()) {
      alert('Signer name is required.');
      return;
    }
    try {
      setSigning(true);
      const signatureData = signatureType === 'DRAW' && canvasRef.current
        ? canvasRef.current.toDataURL()
        : `Signed by: ${signerName}`;

      await api.post(`/portal/quote/${token}/sign`, {
        signerName,
        signerDesignation,
        signatureData
      });

      setSignSuccess(true);
      setShowSignModal(false);
      // Reload quote
      const updatedRes = await api.get(`/portal/quote/${token}`);
      setQuote(updatedRes.data);
    } catch (err) {
      alert('Signing failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-loading-screen">
        <div className="spin-loader" />
        <p>Loading Commercial Quotation...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="portal-error-wrapper">
        <div className="portal-error-card card">
          <AlertCircle size={44} color="#dc3545" />
          <h3>Quotation Not Found</h3>
          <p>{error || 'The link may have expired or is invalid.'}</p>
          <Link to="/portal/login" className="btn btn-primary">Return to Portal Login</Link>
        </div>
      </div>
    );
  }

  const isConfirmed = quote.status === 'CONFIRMED' || quote.status === 'INVOICED';

  return (
    <div className="portal-page-wrapper">
      {/* Top Banner */}
      <header className="portal-top-banner">
        <div className="portal-brand-title">
          <ShieldCheck size={24} />
          <span>DealFlow360 Enterprise Procurement</span>
        </div>
        <div className="portal-top-actions">
          <span className="quote-status-pill">{quote.status}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </header>

      <main className="portal-content-container">
        {/* Confirmed Banner */}
        {isConfirmed && (
          <div className="portal-success-banner card">
            <CheckCircle size={32} color="#28a745" />
            <div>
              <h3>Legally Signed & Confirmed</h3>
              <p>
                This quotation has been electronically signed and confirmed by{' '}
                <strong>{quote.customer?.name}</strong>. Invoices and fulfillment orders have been initialized.
              </p>
            </div>
          </div>
        )}

        {/* Quotation Document Card */}
        <div className="card quote-document-card">
          <div className="doc-header-row">
            <div>
              <h2 className="doc-quote-title">Commercial Quotation</h2>
              <div className="doc-quote-num font-mono">{quote.quoteNumber}</div>
              <div className="doc-date">Issue Date: {formatDate(quote.createdAt)}</div>
            </div>

            <div className="doc-parties-box">
              <div className="doc-party-col">
                <span className="party-role">Prepared For:</span>
                <strong className="party-name">{quote.customer?.name}</strong>
                <div>{quote.customer?.company || 'Corporate Client'}</div>
                <div>{quote.customer?.email}</div>
              </div>
            </div>
          </div>

          <hr className="doc-divider" />

          {/* Line Items Table */}
          <table className="table doc-line-table">
            <thead>
              <tr>
                <th>Item & Description</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines?.map(line => (
                <tr key={line.id}>
                  <td>
                    <strong>{line.product?.name}</strong>
                    <div className="doc-sku text-muted">{line.product?.sku}</div>
                  </td>
                  <td>
                    <span className="badge badge-sm badge-secondary">
                      {line.product?.billingType}
                    </span>
                  </td>
                  <td className="font-mono">{line.quantity}</td>
                  <td className="font-mono">{formatCurrency(line.unitPrice)}</td>
                  <td className="font-mono text-danger">
                    {line.discountPct > 0 ? `${line.discountPct}%` : '—'}
                  </td>
                  <td className="font-mono font-bold" style={{ textAlign: 'right' }}>
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Summary */}
          <div className="doc-summary-footer">
            <div className="doc-terms-box">
              <h4>Terms & Conditions</h4>
              <p>1. Payment terms: {quote.customer?.paymentTerms || 'Net 30 Days'}.</p>
              <p>2. Hardware delivery within 3-5 business days upon digital signature.</p>
              <p>3. Software and SaaS subscriptions activate immediately upon counter-signature.</p>
            </div>

            <div className="doc-totals-box">
              <div className="totals-row">
                <span>Gross Value:</span>
                <span className="font-mono">
                  {formatCurrency(Number(quote.totalAmount) + Number(quote.totalDiscount || 0))}
                </span>
              </div>
              {Number(quote.totalDiscount) > 0 && (
                <div className="totals-row text-danger">
                  <span>Special Discount:</span>
                  <span className="font-mono">- {formatCurrency(quote.totalDiscount)}</span>
                </div>
              )}
              <div className="totals-row final-total font-mono">
                <span>Net Total:</span>
                <span className="font-bold text-navy">{formatCurrency(quote.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Electronic Signature or Actions */}
          {!isConfirmed ? (
            <div className="doc-action-cta-bar">
              <div className="cta-explanation">
                <h4>Ready to proceed?</h4>
                <p>Accept terms and execute through Odoo-integrated digital signature.</p>
              </div>

              <div className="cta-buttons">
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => {
                    const elem = document.getElementById('negotiate-section');
                    elem?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <MessageSquare size={16} /> Request Revision / Negotiate
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowSignModal(true)}
                >
                  <PenTool size={18} /> E-Sign & Confirm Proposal
                </button>
              </div>
            </div>
          ) : (
            <div className="signature-certificate-badge">
              <ShieldCheck size={28} color="#28a745" />
              <div>
                <strong>Digitally Executed via Odoo Sign Protocol</strong>
                <div className="cert-meta">
                  Certificate Hash: SHA256-DF360-{quote.id.slice(0, 8).toUpperCase()} • Signed by {quote.customer?.name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Negotiation & Counter Offer Section */}
        {!isConfirmed && (
          <div id="negotiate-section" className="card portal-negotiate-card">
            <div className="negotiate-card-header">
              <MessageSquare size={20} color="#0F2C59" />
              <div>
                <h3>Request Revision / Counter-Offer</h3>
                <p>Submit your procurement counter-proposal or required terms adjustments directly to your account executive.</p>
              </div>
            </div>

            {negotiationSuccess && (
              <div className="alert-banner alert-banner-success">
                {negotiationSuccess}
              </div>
            )}

            <form onSubmit={handleNegotiateSubmit} className="negotiate-form">
              <div className="form-group">
                <label className="form-label">Requested Target Additional Discount (%)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 5"
                  min="1"
                  max="30"
                  step="0.5"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Procurement Notes / Justification</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. If you can provide a 5% additional discount on the ERP license, our CFO will authorize and sign today."
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={negotiating || !counterMessage.trim()}
              >
                {negotiating ? 'Submitting Counter-Offer...' : (
                  <>
                    <Send size={16} /> Send Counter-Offer to Account Executive
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* E-Signature Modal (Mock Odoo Sign Integration) */}
      {showSignModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div className="modal-title-group">
                <h3><PenTool size={20} /> Odoo E-Signature Authorization</h3>
                <p className="modal-subtitle">Legal digital execution of quotation #{quote.quoteNumber}</p>
              </div>
              <button className="btn-close" onClick={() => setShowSignModal(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="sign-info-bar">
                <div>Contract Amount: <strong>{formatCurrency(quote.totalAmount)}</strong></div>
                <div>Customer: <strong>{quote.customer?.name}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Authorized Signatory Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designation / Role</label>
                <input
                  type="text"
                  className="form-control"
                  value={signerDesignation}
                  onChange={(e) => setSignerDesignation(e.target.value)}
                  required
                />
              </div>

              <div className="signature-mode-toggle">
                <button
                  type="button"
                  className={`toggle-tab ${signatureType === 'TYPE' ? 'active' : ''}`}
                  onClick={() => setSignatureType('TYPE')}
                >
                  Type Signature
                </button>
                <button
                  type="button"
                  className={`toggle-tab ${signatureType === 'DRAW' ? 'active' : ''}`}
                  onClick={() => setSignatureType('DRAW')}
                >
                  Draw Signature
                </button>
              </div>

              {signatureType === 'TYPE' ? (
                <div className="typed-signature-preview">
                  <div className="signature-font-preview">
                    {signerName || 'Your Signature'}
                  </div>
                  <span className="signature-legal-tag">Digitally generated cryptographic stamp</span>
                </div>
              ) : (
                <div className="canvas-signature-wrapper">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="signature-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <div className="canvas-controls">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={clearCanvas}>
                      Clear Canvas
                    </button>
                  </div>
                </div>
              )}

              <div className="sign-consent-text">
                <Check size={14} color="#28a745" /> By signing below, I certify that I am authorized to enter into this contract on behalf of {quote.customer?.company || quote.customer?.name} and agree to the specified terms and conditions.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Cancel</button>
              <button
                className="btn btn-success btn-lg"
                onClick={handleSignConfirm}
                disabled={signing || !signerName.trim()}
              >
                {signing ? 'Cryptographically Signing...' : 'Adopt Signature & Confirm Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
