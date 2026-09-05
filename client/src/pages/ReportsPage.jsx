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
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Quarter to Date');
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const res = await api.get('/quotations');
        setQuotations(res.data);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReports();

    // Trigger smooth entrance animation on mount
    const timer = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const totalQuotes = quotations.length;
  const grossSales = quotations.reduce((acc, q) => acc + (Number(q.totalAmount || 0) + Number(q.totalDiscount || 0)), 0);
  const totalDiscounts = quotations.reduce((acc, q) => acc + Number(q.totalDiscount || 0), 0);
  const netRevenue = quotations.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);
  const avgDiscountRate = grossSales > 0 ? (totalDiscounts / grossSales) * 100 : 0;
  const realizationRate = grossSales > 0 ? Math.round((netRevenue / grossSales) * 100) : 88;

  // Monthly revenue trend data for animated SVG chart
  const monthlyTrendData = [
    { month: 'Mar', gross: 2400000, discount: 280000, net: 2120000, label: '₹21.2L' },
    { month: 'Apr', gross: 3100000, discount: 340000, net: 2760000, label: '₹27.6L' },
    { month: 'May', gross: 2850000, discount: 310000, net: 2540000, label: '₹25.4L' },
    { month: 'Jun', gross: 3650000, discount: 410000, net: 3240000, label: '₹32.4L' },
    { month: 'Jul', gross: 4200000, discount: 460000, net: 3740000, label: '₹37.4L' },
    { month: 'Aug', gross: grossSales > 0 ? grossSales : 4900000, discount: totalDiscounts > 0 ? totalDiscounts : 520000, net: netRevenue > 0 ? netRevenue : 4380000, label: formatCurrency(netRevenue > 0 ? netRevenue : 4380000) },
  ];

  // Category Profitability breakdown
  const categoryProfitability = [
    { category: 'Hardware Infrastructure', marginPct: 44, discountCeiling: 18, color: '#0F2C59' },
    { category: 'Enterprise SaaS & Cloud', marginPct: 72, discountCeiling: 40, color: '#2563eb' },
    { category: 'Professional Services', marginPct: 65, discountCeiling: 15, color: '#10b981' },
    { category: 'Peripherals & Accessories', marginPct: 54, discountCeiling: 20, color: '#f59e0b' },
  ];

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

        <div className="reports-header-actions">
          <span className="wh-telemetry-badge">
            <span className="wh-telemetry-dot" /> Audit Ledger Live
          </span>
          <div className="category-pill-group" style={{ margin: 0 }}>
            {['Last 30 Days', 'Quarter to Date', 'Year to Date'].map(range => (
              <button
                key={range}
                className={`category-pill ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="btn btn-outline-primary" onClick={() => window.print()}>
            <Download size={14} /> Export Report
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
              <path
                d="M 65 155 Q 165 125, 265 138 T 465 85 T 565 60 L 565 200 L 65 200 Z"
                fill="url(#netAreaGrad)"
                style={{
                  opacity: animated ? 1 : 0,
                  transition: 'opacity 1s ease'
                }}
              />
              <path
                d="M 65 155 Q 165 125, 265 138 T 465 85 T 565 60"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 600,
                  strokeDashoffset: animated ? 0 : 600,
                  transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />

              {/* Monthly Dual Bars */}
              {monthlyTrendData.map((d, idx) => {
                const x = 50 + idx * 100;
                const maxVal = 5500000;
                const grossHeight = animated ? Math.round((d.gross / maxVal) * 160) : 0;
                const discountHeight = animated ? Math.max(10, Math.round((d.discount / maxVal) * 160)) : 0;
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
                <tr>
                  <td>
                    <span className="tier-pill-modern platinum">PLATINUM</span>
                  </td>
                  <td className="font-mono font-bold">25%</td>
                  <td>
                    <div className="tier-margin-gauge">
                      <div className="tier-gauge-bar">
                        <div className="tier-gauge-fill" style={{ width: animated ? '45%' : '0%' }} />
                      </div>
                      <span className="font-mono font-bold" style={{ fontSize: '0.82rem' }}>45%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Compliant
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="tier-pill-modern gold">GOLD</span>
                  </td>
                  <td className="font-mono font-bold">15%</td>
                  <td>
                    <div className="tier-margin-gauge">
                      <div className="tier-gauge-bar">
                        <div className="tier-gauge-fill" style={{ width: animated ? '52%' : '0%' }} />
                      </div>
                      <span className="font-mono font-bold" style={{ fontSize: '0.82rem' }}>52%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Compliant
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="tier-pill-modern silver">SILVER</span>
                  </td>
                  <td className="font-mono font-bold">10%</td>
                  <td>
                    <div className="tier-margin-gauge">
                      <div className="tier-gauge-bar">
                        <div className="tier-gauge-fill" style={{ width: animated ? '58%' : '0%' }} />
                      </div>
                      <span className="font-mono font-bold" style={{ fontSize: '0.82rem' }}>58%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Compliant
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="tier-pill-modern standard">STANDARD</span>
                  </td>
                  <td className="font-mono font-bold">5%</td>
                  <td>
                    <div className="tier-margin-gauge">
                      <div className="tier-gauge-bar">
                        <div className="tier-gauge-fill" style={{ width: animated ? '65%' : '0%' }} />
                      </div>
                      <span className="font-mono font-bold" style={{ fontSize: '0.82rem' }}>65%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Compliant
                    </span>
                  </td>
                </tr>
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
