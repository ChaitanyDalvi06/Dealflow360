import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, getStatusBadgeClass, getRiskBadgeClass } from '../utils/formatters';
import { 
  DollarSign, TrendingUp, AlertCircle, CheckCircle2, 
  ExternalLink, Eye, ArrowRight, Filter, Search
} from 'lucide-react';

const STAGES = [
  { id: 'DRAFT', label: 'Draft', color: '#6c757d' },
  { id: 'PENDING_APPROVAL', label: 'In Approval Chain', color: '#e67e22' },
  { id: 'APPROVED', label: 'Approved (Ready to Send)', color: '#2980b9' },
  { id: 'SENT', label: 'Sent to Customer', color: '#8e44ad' },
  { id: 'NEGOTIATING', label: 'Negotiation / Counter', color: '#d35400' },
  { id: 'CONFIRMED', label: 'Signed & Confirmed', color: '#27ae60' },
  { id: 'INVOICED', label: 'Billed & Active', color: '#16a085' },
];

export default function PipelinePage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  // Compute summary stats
  const totalValue = quotations.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);
  const approvedValue = quotations
    .filter(q => ['APPROVED', 'SENT', 'CONFIRMED', 'INVOICED'].includes(q.status))
    .reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);
  const inApprovalCount = quotations.filter(q => q.status === 'PENDING_APPROVAL').length;
  const highRiskCount = quotations.filter(q => q.riskLevel === 'HIGH').length;

  const filteredQuotes = quotations.filter(q => {
    const matchesSearch = q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pipeline-container">
      {/* KPI Header Cards */}
      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-navy">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Pipeline Value</div>
            <div className="kpi-value font-mono">{formatCurrency(totalValue)}</div>
            <div className="kpi-meta">{quotations.length} total deals active</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-success">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Qualified & Approved</div>
            <div className="kpi-value font-mono">{formatCurrency(approvedValue)}</div>
            <div className="kpi-meta">High probability to close</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-warning">
            <AlertCircle size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Pending Approval</div>
            <div className="kpi-value font-mono">{inApprovalCount}</div>
            <div className="kpi-meta">Awaiting Manager / VP signoff</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-wrapper kpi-danger">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">High Risk Deals</div>
            <div className="kpi-value font-mono">{highRiskCount}</div>
            <div className="kpi-meta">Discount &gt; 25% or low margin</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card pipeline-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by quote # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <div className="filter-group">
            <Filter size={16} />
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Stages</option>
              {STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/workspace')}>
            + Create Deal
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="kanban-board">
        {STAGES.map(stage => {
          const stageQuotes = filteredQuotes.filter(q => q.status === stage.id);
          const stageTotal = stageQuotes.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

          return (
            <div key={stage.id} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-header-left">
                  <span className="kanban-stage-dot" style={{ backgroundColor: stage.color }} />
                  <span className="kanban-stage-title">{stage.label}</span>
                </div>
                <span className="kanban-badge">{stageQuotes.length}</span>
              </div>
              <div className="kanban-column-amount font-mono">
                {formatCurrency(stageTotal)}
              </div>

              <div className="kanban-cards-list">
                {stageQuotes.map(quote => (
                  <div key={quote.id} className="card kanban-card">
                    <div className="kanban-card-top">
                      <span className="kanban-quote-num">{quote.quoteNumber}</span>
                      <span className={`badge ${getRiskBadgeClass(quote.riskLevel)}`}>
                        {quote.riskLevel}
                      </span>
                    </div>

                    <div className="kanban-customer-name">
                      {quote.customer?.name}
                      <small>{quote.customer?.companyName}</small>
                    </div>

                    <div className="kanban-card-financials">
                      <div className="kanban-amount font-mono">
                        {formatCurrency(quote.totalAmount)}
                      </div>
                      {quote.totalDiscount > 0 && (
                        <div className="kanban-discount">
                          Disc: {formatCurrency(quote.totalDiscount)}
                        </div>
                      )}
                    </div>

                    <div className="kanban-card-tags">
                      <span className="badge badge-sm badge-secondary">
                        {quote.lines?.length || 0} items
                      </span>
                      {quote.customer?.tier && (
                        <span className={`badge badge-sm ${getStatusBadgeClass(quote.customer.tier)}`}>
                          {quote.customer.tier}
                        </span>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="kanban-card-footer">
                      <button
                        className="btn-icon-link"
                        title="Edit in Workspace"
                        onClick={() => navigate(`/workspace?id=${quote.id}`)}
                      >
                        <Eye size={15} /> Edit
                      </button>

                      {quote.portalToken && (
                        <a
                          href={`/portal/quote/${quote.portalToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon-link"
                          title="View Customer Portal"
                        >
                          <ExternalLink size={15} /> Portal
                        </a>
                      )}

                      {quote.status === 'APPROVED' && (
                        <button
                          className="btn-icon-link btn-highlight"
                          title="Allocate Stock"
                          onClick={() => navigate(`/warehouse?quoteId=${quote.id}`)}
                        >
                          <ArrowRight size={15} /> Split
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {stageQuotes.length === 0 && (
                  <div className="kanban-empty">No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
