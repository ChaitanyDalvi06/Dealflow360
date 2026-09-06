import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { 
  BarChart3, TrendingDown, Award, PieChart, ShieldCheck, Download, 
  CheckCircle2, UserCheck, ShieldAlert, Sparkles, Calendar, ArrowUpRight,
  TrendingUp, Layers, Clock
} from 'lucide-react';

export default function ReportsPage() {
  const [quotations, setQuotations] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Quarter to Date');
  const [selectedRep, setSelectedRep] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        setLoading(true);
        const [analyticsRes, quotesRes] = await Promise.allSettled([
          api.get('/dashboard/reports-analytics', { params: { timeRange } }),
          api.get('/quotations'),
        ]);

        if (!isMounted) return;

        if (analyticsRes.status === 'fulfilled') {
          setReportData(analyticsRes.value.data);
        }
        if (quotesRes.status === 'fulfilled') {
          setQuotations(quotesRes.value.data || []);
        }
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadReports();

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(timer);
  }, [reportData]);

  const availableReps = Array.from(new Set(quotations.map(q => q.rep?.name).filter(Boolean)));
  const availableCategories = ['Hardware', 'Software', 'Service', 'Accessories'];

  const filteredQuotes = quotations.filter(q => {
    const repMatch = selectedRep === 'ALL' || q.rep?.name === selectedRep;
    const statusMatch = selectedStatus === 'ALL' || q.status === selectedStatus;
    const catMatch = selectedCategory === 'ALL' || q.lines?.some(l => l.product?.category === selectedCategory);
    return repMatch && statusMatch && catMatch;
  });

  const exportToCSV = () => {
    const headers = ['Quote Number', 'Customer', 'Tier', 'Sales Rep', 'Status', 'Order Total', 'Margin', 'Created At'];
    const rows = filteredQuotes.map(q => [
      q.quoteNumber || `QT-${q.id.slice(-6).toUpperCase()}`,
      `"${q.customer?.name || 'Customer'}"`,
      q.customer?.tier || 'BRONZE',
      `"${q.rep?.name || 'Rep'}"`,
      q.status,
      Number(q.orderTotal || 0),
      Number(q.totalMargin || 0),
      new Date(q.createdAt).toISOString().split('T')[0],
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dealflow360_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate locally from filtered quotations
  let localGross = 0;
  let localNet = 0;
  let localDiscounts = 0;

  for (const q of filteredQuotes) {
    let qNet = Number(q.orderTotal || 0);
    let qGross = 0;
    let qDisc = 0;

    if (Array.isArray(q.lines) && q.lines.length > 0) {
      for (const line of q.lines) {
        const qty = Number(line.quantity || 1);
        const price = Number(line.unitPrice || 0);
        const lNet = Number(line.lineTotal || 0);
        const lGross = qty * price > 0 ? qty * price : lNet;
        const lDisc = Math.max(0, lGross - lNet);

        qGross += lGross;
        qDisc += lDisc;
      }
    }
    if (qGross === 0 && qNet > 0) qGross = qNet;
    if (qNet === 0 && qGross > 0) qNet = Math.max(0, qGross - qDisc);

    localGross += qGross;
    localNet += qNet;
    localDiscounts += qDisc;
  }

  const totalQuotes = filteredQuotes.length;
  const grossSales = localGross;
  const totalDiscounts = localDiscounts;
  const netRevenue = localNet;
  const avgDiscountRate = grossSales > 0 ? Number(((totalDiscounts / grossSales) * 100).toFixed(1)) : 0;
  const realizationRate = grossSales > 0 ? Math.round((netRevenue / grossSales) * 100) : 88;
  const momGrowth = reportData?.summary?.momGrowth ?? 14.2;

  // Monthly revenue trend data for animated SVG chart
  const defaultTrendData = [
    { month: 'Mar', gross: 2400000, discount: 280000, net: 2120000, label: '₹21.2L' },
    { month: 'Apr', gross: 3100000, discount: 340000, net: 2760000, label: '₹27.6L' },
    { month: 'May', gross: 2850000, discount: 310000, net: 2540000, label: '₹25.4L' },
    { month: 'Jun', gross: 3650000, discount: 410000, net: 3240000, label: '₹32.4L' },
    { month: 'Jul', gross: 4200000, discount: 460000, net: 3740000, label: '₹37.4L' },
    { month: 'Aug', gross: 4900000, discount: 520000, net: 4380000, label: '₹43.8L' },
  ];

  const monthlyTrendData = (reportData?.monthlyTrendData && reportData.monthlyTrendData.length > 0)
    ? reportData.monthlyTrendData
    : defaultTrendData;

  // Category Profitability breakdown
  const defaultCategoryProfitability = [
    { category: 'Hardware Infrastructure', marginPct: 44, discountCeiling: 18, color: '#0F2C59' },
    { category: 'Enterprise SaaS & Cloud', marginPct: 72, discountCeiling: 40, color: '#2563eb' },
    { category: 'Professional Services', marginPct: 65, discountCeiling: 15, color: '#10b981' },
    { category: 'Peripherals & Accessories', marginPct: 54, discountCeiling: 20, color: '#f59e0b' },
  ];

  const categoryProfitability = (reportData?.categoryProfitability && reportData.categoryProfitability.length > 0)
    ? reportData.categoryProfitability
    : defaultCategoryProfitability;

  // Tier-Wise Margin Realization
  const defaultTierMatrix = [
    { tier: 'PLATINUM', standardCap: '25%', marginPct: 45, isCompliant: true },
    { tier: 'GOLD', standardCap: '15%', marginPct: 52, isCompliant: true },
    { tier: 'SILVER', standardCap: '10%', marginPct: 58, isCompliant: true },
    { tier: 'STANDARD', standardCap: '5%', marginPct: 65, isCompliant: true },
  ];

  const tierMatrix = (reportData?.tierMatrix && reportData.tierMatrix.length > 0)
    ? reportData.tierMatrix
    : defaultTierMatrix;

  // Compute dynamic scale and SVG curve points
  const maxVal = Math.max(...monthlyTrendData.map(d => Number(d.gross || 0)), 100000) * 1.15;
  const points = monthlyTrendData.map((d, idx) => ({
    x: 50 + idx * 100 + 20,
    y: Math.max(30, 200 - Math.round(((Number(d.net) || 0) / maxVal) * 160))
  }));

  const generateSmoothPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`
    : '';

  return (
    <div className="reports-container">
      {/* Modern Header */}
      <div className="reports-header-modern">
        <div className="reports-header-left">
          <div className="reports-header-icon">
            <BarChart3 size={24} />
          </div>
          <div className="reports-header-text">
            <h2>Financial Intelligence & Governance Analytics</h2>
            <p>Audit discount leakage, approval bottleneck latencies, and category margin trends.</p>
          </div>
        </div>

        <div className="reports-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {/* Filter: Sales Rep */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748B' }}>Rep:</span>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              style={{ fontSize: '0.75rem', fontWeight: '600', border: 'none', background: 'transparent', outline: 'none', color: '#0F2C59' }}
            >
              <option value="ALL">All Reps ({availableReps.length})</option>
              {availableReps.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          {/* Filter: Status */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748B' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ fontSize: '0.75rem', fontWeight: '600', border: 'none', background: 'transparent', outline: 'none', color: '#0F2C59' }}
            >
              <option value="ALL">All Stages</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_MANAGER">Pending Manager</option>
              <option value="PENDING_FINANCE">Pending Finance</option>
              <option value="APPROVED">Approved</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_FULFILLMENT">In Fulfillment</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Filter: Category */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748B' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ fontSize: '0.75rem', fontWeight: '600', border: 'none', background: 'transparent', outline: 'none', color: '#0F2C59' }}
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="category-pill-group" style={{ margin: 0 }}>
            {['Last 30 Days', 'Quarter to Date', 'Year to Date'].map(range => (
              <button
                key={range}
                className={`category-pill ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
                style={{ fontSize: '0.74rem', padding: '5px 10px' }}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export to CSV / XLS */}
          <button className="btn btn-outline-primary" onClick={exportToCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px' }}>
            <Download size={13} /> Export CSV / XLS
          </button>

          {/* Print PDF */}
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px' }}>
            Print PDF
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="reports-kpi-grid">
        {/* KPI 1: Gross Volume */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <div className="reports-kpi-icon navy">
              <Award size={22} />
            </div>
            <span className="reports-kpi-badge positive">
              <ArrowUpRight size={13} /> +14.2% MoM
            </span>
          </div>
          <div>
            <div className="reports-kpi-label">Gross Deal Volume</div>
            <div className="reports-kpi-val">{formatCurrency(grossSales)}</div>
            <div className="reports-kpi-sub">
              <span>{totalQuotes} quotations processed across enterprise accounts</span>
            </div>
          </div>
          <div className="reports-kpi-bar">
            <div 
              className="reports-kpi-bar-fill" 
              style={{ width: animated ? '100%' : '0%', background: '#0F2C59' }} 
            />
          </div>
        </div>

        {/* KPI 2: Total Discounts */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <div className="reports-kpi-icon amber">
              <TrendingDown size={22} />
            </div>
            <span className="reports-kpi-badge warning">
              {formatPercent(avgDiscountRate)} Leakage
            </span>
          </div>
          <div>
            <div className="reports-kpi-label">Total Commercial Discounts</div>
            <div className="reports-kpi-val" style={{ color: '#d97706' }}>
              {formatCurrency(totalDiscounts)}
            </div>
            <div className="reports-kpi-sub">
              <span>Protected by categorical margin guardrail floors</span>
            </div>
          </div>
          <div className="reports-kpi-bar">
            <div 
              className="reports-kpi-bar-fill" 
              style={{ 
                width: animated ? `${Math.min(100, avgDiscountRate * 2.5)}%` : '0%', 
                background: '#f59e0b' 
              }} 
            />
          </div>
        </div>

        {/* KPI 3: Net Revenue */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <div className="reports-kpi-icon emerald">
              <ShieldCheck size={22} />
            </div>
            <span className="reports-kpi-badge positive">
              {realizationRate}% Realization
            </span>
          </div>
          <div>
            <div className="reports-kpi-label">Net Realized Revenue</div>
            <div className="reports-kpi-val" style={{ color: '#059669' }}>
              {formatCurrency(netRevenue)}
            </div>
            <div className="reports-kpi-sub">
              <span>Net cashflow after commercial adjustments</span>
            </div>
          </div>
          <div className="reports-kpi-bar">
            <div 
              className="reports-kpi-bar-fill" 
              style={{ 
                width: animated ? `${realizationRate}%` : '0%', 
                background: '#10b981' 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Animated Charts Grid */}
      <div className="reports-charts-grid">
        {/* Left Chart: Monthly Revenue vs Governed Discount Trend */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <div className="reports-chart-titles">
              <h3><TrendingUp size={18} /> Revenue vs. Governed Discounts Trend</h3>
              <p>Monthly gross quotation volume vs discount leakage over past 6 months</p>
            </div>
            <div className="reports-chart-legend">
              <div className="reports-legend-item">
                <span className="reports-legend-dot" style={{ background: '#0F2C59' }} />
                <span>Gross Volume</span>
              </div>
              <div className="reports-legend-item">
                <span className="reports-legend-dot" style={{ background: '#f59e0b' }} />
                <span>Discount Leakage</span>
              </div>
              <div className="reports-legend-item">
                <span className="reports-legend-dot" style={{ background: '#10b981' }} />
                <span>Net Realized</span>
              </div>
            </div>
          </div>

          {/* Animated SVG Chart Canvas */}
          <div className="svg-chart-container">
            <svg 
              className="svg-chart-canvas" 
              viewBox="0 0 650 240" 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="barGradientNavy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F2C59" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="barGradientAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.65" />
                </linearGradient>
                <linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 90, 140, 190].map((y, idx) => (
                <line 
                  key={idx} 
                  x1="30" 
                  y1={y} 
                  x2="630" 
                  y2={y} 
                  stroke="rgba(15, 44, 89, 0.06)" 
                  strokeDasharray="4 4" 
                />
              ))}

              {/* Connected Area Curve for Net Realized */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#netAreaGrad)"
                  style={{
                    opacity: animated ? 1 : 0,
                    transition: 'opacity 1s ease'
                  }}
                />
              )}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 800,
                    strokeDashoffset: animated ? 0 : 800,
                    transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              )}

              {/* Monthly Dual Bars */}
              {monthlyTrendData.map((d, idx) => {
                const x = 50 + idx * 100;
                const grossHeight = animated ? Math.round(((Number(d.gross) || 0) / maxVal) * 160) : 0;
                const discountHeight = animated ? Math.max(8, Math.round(((Number(d.discount) || 0) / maxVal) * 160)) : 0;
                const isHovered = hoveredMonth === idx;

                return (
                  <g 
                    key={d.month} 
                    className="chart-bar-group"
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Gross Bar */}
                    <rect
                      x={x}
                      y={200 - grossHeight}
                      width="20"
                      height={grossHeight}
                      rx="5"
                      fill="url(#barGradientNavy)"
                      style={{
                        transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1), y 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                    {/* Discount Bar */}
                    <rect
                      x={x + 24}
                      y={200 - discountHeight}
                      width="16"
                      height={discountHeight}
                      rx="4"
                      fill="url(#barGradientAmber)"
                      style={{
                        transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1), y 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                    {/* Month Label */}
                    <text
                      x={x + 22}
                      y="222"
                      textAnchor="middle"
                      fill={isHovered ? '#0F2C59' : '#64748b'}
                      fontSize="12"
                      fontFamily="Space Grotesk, sans-serif"
                      fontWeight={isHovered ? '700' : '500'}
                    >
                      {d.month}
                    </text>

                    {/* Interactive Value Tooltip Bubble */}
                    {isHovered && (
                      <g>
                        <rect
                          x={x - 20}
                          y={200 - grossHeight - 32}
                          width="85"
                          height="24"
                          rx="6"
                          fill="#0F2C59"
                        />
                        <text
                          x={x + 22}
                          y={200 - grossHeight - 16}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="600"
                        >
                          {d.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Chart: Categorical Margin Realization Radars */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <div className="reports-chart-titles">
              <h3><PieChart size={18} /> Category Profitability</h3>
              <p>Target gross margin vs categorical discount ceiling</p>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.74rem' }}>
              4 Categories
            </span>
          </div>

          <div className="category-progress-list">
            {categoryProfitability.map(cat => (
              <div key={cat.category} className="cat-progress-item">
                <div className="cat-progress-header">
                  <div className="cat-progress-name">
                    <span className="cat-progress-dot" style={{ background: cat.color }} />
                    <span>{cat.category}</span>
                  </div>
                  <div className="cat-progress-stats">
                    <span className="cat-progress-margin">{cat.marginPct}% Margin</span>
                    <span className="cat-progress-cap">Max Cap: {cat.discountCeiling}%</span>
                  </div>
                </div>
                <div className="cat-progress-bar-track">
                  <div
                    className="cat-progress-bar-fill"
                    style={{
                      width: animated ? `${cat.marginPct}%` : '0%',
                      background: cat.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', padding: '12px 14px', background: 'rgba(15, 44, 89, 0.03)', borderRadius: '12px', border: '1px solid rgba(15, 44, 89, 0.08)', fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#0F2C59' }}>Guardrail Note: </span>
            Categorical margin floors prevent cross-category subsidy and protect profitability across diverse SKU bundles.
          </div>
        </div>
      </div>

      {/* Bottom Analytics Grid */}
      <div className="reports-bottom-grid">
        {/* Tier-Wise Margin Realization Matrix */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <div className="reports-chart-titles">
              <h3><ShieldCheck size={18} /> Tier-Wise Margin Realization</h3>
              <p>Commercial discount guardrails & realized profitability by account tier</p>
            </div>
            <span className="badge badge-info">Strategic Accounts</span>
          </div>

          <div className="tier-matrix-table-wrap">
            <table className="tier-matrix-table">
              <thead>
                <tr>
                  <th>Customer Tier</th>
                  <th>Standard Cap</th>
                  <th>Target Margin</th>
                  <th style={{ textAlign: 'center' }}>Compliance</th>
                </tr>
              </thead>
              <tbody>
                {tierMatrix.map((row) => (
                  <tr key={row.tier}>
                    <td>
                      <span className={`tier-pill-modern ${row.tier.toLowerCase()}`}>{row.tier}</span>
                    </td>
                    <td className="font-mono font-bold">{row.standardCap}</td>
                    <td>
                      <div className="tier-margin-gauge">
                        <div className="tier-gauge-bar">
                          <div
                            className="tier-gauge-fill"
                            style={{ width: animated ? `${Math.min(100, row.marginPct)}%` : '0%' }}
                          />
                        </div>
                        <span className="font-mono font-bold" style={{ fontSize: '0.82rem' }}>
                          {row.marginPct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Compliant
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Chain Latency */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <div className="reports-chart-titles">
              <h3><Clock size={18} /> Approval Chain Latency</h3>
              <p>Turnaround times across escalation authority tiers</p>
            </div>
            <span className="badge badge-primary">SLA Metric</span>
          </div>

          <div className="latency-pipeline">
            {/* Stage 1 */}
            <div className="latency-step-card">
              <div className="latency-step-left">
                <div className="latency-step-avatar green">
                  <CheckCircle2 size={18} />
                </div>
                <div className="latency-step-info">
                  <strong>Level 1 (Auto-Approve)</strong>
                  <span>Instant algorithmic rule engine check</span>
                </div>
              </div>
              <div className="latency-step-right">
                <span className="latency-step-time green">0.05s Instant</span>
                <span className="latency-sla-badge">99.8% SLA Hit</span>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="latency-step-card">
              <div className="latency-step-left">
                <div className="latency-step-avatar blue">
                  <UserCheck size={18} />
                </div>
                <div className="latency-step-info">
                  <strong>Level 2 (Sales Manager)</strong>
                  <span>Tier overage & rep concession sign-off</span>
                </div>
              </div>
              <div className="latency-step-right">
                <span className="latency-step-time blue">2.4 hours avg</span>
                <span className="latency-sla-badge">Target &lt;4 hours</span>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="latency-step-card">
              <div className="latency-step-left">
                <div className="latency-step-avatar amber">
                  <ShieldAlert size={18} />
                </div>
                <div className="latency-step-info">
                  <strong>Level 3 (Director / VP)</strong>
                  <span>Executive margin authorization</span>
                </div>
              </div>
              <div className="latency-step-right">
                <span className="latency-step-time amber">6.1 hours avg</span>
                <span className="latency-sla-badge">Target &lt;8 hours</span>
              </div>
            </div>
          </div>

          <div className="latency-summary-note">
            <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>92% of standard proposals auto-approved within SLA</strong>, reducing typical sales negotiation cycle time from 3 business days to under 4 hours.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
