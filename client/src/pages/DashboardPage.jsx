import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Coins, CheckSquare, Clock, ArrowUp, ArrowDown, 
  ChevronDown, ArrowRight, MoreHorizontal 
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [funnelFilter] = useState('This Month');
  const [productFilter] = useState('This Month');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on mount
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Revenue trend data for combo Bar + Line chart
  const revenueTrendData = [
    { month: 'Jan', revenue: 9.2, quotations: 14, revLabel: '₹9.2L' },
    { month: 'Feb', revenue: 14.5, quotations: 20, revLabel: '₹14.5L' },
    { month: 'Mar', revenue: 22.1, quotations: 27, revLabel: '₹22.1L' },
    { month: 'Apr', revenue: 28.0, quotations: 32, revLabel: '₹28.0L' },
    { month: 'May', revenue: 30.5, quotations: 34, revLabel: '₹30.5L' },
    { month: 'Jun', revenue: 32.2, quotations: 38, revLabel: '₹32.2L' },
    { month: 'Jul', revenue: 34.8, quotations: 42, revLabel: '₹34.8L' },
    { month: 'Aug', revenue: 38.6, quotations: 48, revLabel: '₹38.6L' },
  ];

  // Sales Funnel Data
  const funnelStages = [
    { label: 'Leads', count: 128, pct: '100%', color: '#0F2C59' },
    { label: 'Qualified', count: 87, pct: '68%', color: '#3A608F' },
    { label: 'Proposal', count: 46, pct: '36%', color: '#DAC0A3' },
    { label: 'Negotiation', count: 28, pct: '22%', color: '#C4A882' },
    { label: 'Won', count: 15, pct: '12%', color: '#9E7B4B' },
  ];

  // Top Products Data
  const topProducts = [
    { name: 'Laptops', amount: '₹ 42.5L', widthPct: 100, color: '#0F2C59' },
    { name: 'Cloud Subscription', amount: '₹ 28.3L', widthPct: 67, color: '#244B7E' },
    { name: 'Installation Services', amount: '₹ 18.7L', widthPct: 44, color: '#4D729C' },
    { name: 'Monitors', amount: '₹ 12.4L', widthPct: 29, color: '#8BA0B8' },
    { name: 'Premium Support', amount: '₹ 8.1L', widthPct: 19, color: '#B6C4D3' },
  ];

  // Warehouse Utilization Data
  const warehouses = [
    { name: 'Mumbai', pct: 78, color: '#0F2C59' },
    { name: 'Pune', pct: 62, color: '#274E82' },
    { name: 'Bangalore', pct: 45, color: '#7E9BB8' },
    { name: 'Delhi', pct: 38, color: '#CDB194' },
    { name: 'Hyderabad', pct: 27, color: '#DEC6B0' },
  ];

  // Recent Deals Data
  const recentDeals = [
    { id: '#Q-1042', customer: 'Acme Corp', value: '₹ 24,50,000', status: 'Pending Approval', statusStyle: 'badge-pending-pill', stage: 'Negotiation', activity: '2 hours ago' },
    { id: '#Q-1041', customer: 'TechNova', value: '₹ 12,30,000', status: 'Sent to Customer', statusStyle: 'badge-sent-pill', stage: 'Proposal', activity: '5 hours ago' },
    { id: '#Q-1040', customer: 'Globex Ltd', value: '₹ 8,70,000', status: 'Negotiation', statusStyle: 'badge-negotiate-pill', stage: 'Negotiation', activity: '1 day ago' },
    { id: '#Q-1039', customer: 'Innotech', value: '₹ 18,90,000', status: 'Won', statusStyle: 'badge-won-pill', stage: 'Closed', activity: '2 days ago' },
    { id: '#Q-1038', customer: 'Vertex Solutions', value: '₹ 5,60,000', status: 'At Risk', statusStyle: 'badge-risk-pill', stage: 'Proposal', activity: '2 days ago' },
  ];



  return (
    <div className={`dash-exact-page ${animated ? 'is-animated' : ''}`}>


      {/* ─── 4 Top KPI Cards ─── */}
      <div className="dash-kpi-row">
        {/* Total Quotations */}
        <div className="dash-kpi-box animated-card" style={{ animationDelay: '0.05s' }}>
          <div className="kpi-icon-square">
            <FileText size={22} className="kpi-icon-gold" />
          </div>
          <div className="kpi-info-col">
            <span className="kpi-title-text">Total Quotations</span>
            <div className="kpi-number-val">48</div>
            <div className="kpi-trend-pill trend-up">
              <ArrowUp size={13} /> <span>12%</span> vs last month
            </div>
          </div>
        </div>

        {/* Total Deal Value */}
        <div className="dash-kpi-box animated-card" style={{ animationDelay: '0.1s' }}>
          <div className="kpi-icon-square">
            <Coins size={22} className="kpi-icon-gold" />
          </div>
          <div className="kpi-info-col">
            <span className="kpi-title-text">Total Deal Value</span>
            <div className="kpi-number-val">₹1.24 Cr</div>
            <div className="kpi-trend-pill trend-up">
              <ArrowUp size={13} /> <span>18%</span> vs last month
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="dash-kpi-box animated-card" style={{ animationDelay: '0.15s' }}>
          <div className="kpi-icon-square">
            <CheckSquare size={22} className="kpi-icon-gold" />
          </div>
          <div className="kpi-info-col">
            <span className="kpi-title-text">Win Rate</span>
            <div className="kpi-number-val">32%</div>
            <div className="kpi-trend-pill trend-up">
              <ArrowUp size={13} /> <span>6%</span> vs last month
            </div>
          </div>
        </div>

        {/* Avg. Sales Cycle */}
        <div className="dash-kpi-box animated-card" style={{ animationDelay: '0.2s' }}>
          <div className="kpi-icon-square">
            <Clock size={22} className="kpi-icon-gold" />
          </div>
          <div className="kpi-info-col">
            <span className="kpi-title-text">Avg. Sales Cycle</span>
            <div className="kpi-number-val">18 days</div>
            <div className="kpi-trend-pill trend-down-good">
              <ArrowDown size={13} /> <span>14%</span> vs last month
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 2: Sales Funnel | Revenue Trend | Deal Health ─── */}
      <div className="dash-row-grid row-3-cols">
        {/* 1. Sales Funnel */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.25s' }}>
          <div className="panel-card-head">
            <h3>Sales Funnel</h3>
            <div className="panel-filter-pill">
              <span>{funnelFilter}</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="funnel-content-wrapper">
            {/* Left: SVG Trapezoid Funnel */}
            <div className="funnel-graphic-col">
              <svg viewBox="0 0 160 160" className="funnel-svg">
                {/* Trap 1: Leads */}
                <polygon 
                  points="5,0 155,0 142,30 18,30" 
                  fill="#0F2C59" 
                  className={`funnel-slice ${animated ? 'animate-slide' : ''}`}
                  style={{ animationDelay: '0.1s' }}
                />
                <text x="80" y="20" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">128</text>

                {/* Trap 2: Qualified */}
                <polygon 
                  points="20,33 140,33 128,63 32,63" 
                  fill="#3A608F" 
                  className={`funnel-slice ${animated ? 'animate-slide' : ''}`}
                  style={{ animationDelay: '0.2s' }}
                />
                <text x="80" y="53" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">87</text>

                {/* Trap 3: Proposal */}
                <polygon 
                  points="34,66 126,66 114,96 46,96" 
                  fill="#DAC0A3" 
                  className={`funnel-slice ${animated ? 'animate-slide' : ''}`}
                  style={{ animationDelay: '0.3s' }}
                />
                <text x="80" y="86" textAnchor="middle" fill="#0F2C59" fontWeight="700" fontSize="12">46</text>

                {/* Trap 4: Negotiation */}
                <polygon 
                  points="48,99 112,99 101,129 59,129" 
                  fill="#C4A882" 
                  className={`funnel-slice ${animated ? 'animate-slide' : ''}`}
                  style={{ animationDelay: '0.4s' }}
                />
                <text x="80" y="119" textAnchor="middle" fill="#0F2C59" fontWeight="700" fontSize="12">28</text>

                {/* Trap 5: Won */}
                <polygon 
                  points="61,132 99,132 92,158 68,158" 
                  fill="#9E7B4B" 
                  className={`funnel-slice ${animated ? 'animate-slide' : ''}`}
                  style={{ animationDelay: '0.5s' }}
                />
                <text x="80" y="150" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">15</text>
              </svg>
            </div>

            {/* Right: Funnel Legend (Single clean line per stage) */}
            <div className="funnel-legend-col">
              {funnelStages.map((stg, i) => (
                <div key={i} className="funnel-legend-row">
                  <div className="legend-label-wrap">
                    <span className="funnel-dot" style={{ backgroundColor: stg.color }} />
                    <span className="funnel-title">{stg.label}</span>
                  </div>
                  <div className="legend-value-wrap">
                    <strong className="legend-count">{stg.count}</strong>
                    <span className="legend-pct">({stg.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Revenue Trend */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.3s' }}>
          <div className="panel-card-head">
            <h3>Revenue Trend</h3>
            <div className="chart-legend-row">
              <div className="chart-legend-item">
                <span className="legend-box-navy" />
                <span>Revenue</span>
              </div>
              <div className="chart-legend-item">
                <span className="legend-line-gold" />
                <span>Quotations</span>
              </div>
            </div>
          </div>

          <div className="chart-wrapper">
            <svg viewBox="0 0 460 210" className="trend-chart-svg">
              {/* Horizontal Grid lines */}
              <line x1="45" y1="20" x2="440" y2="20" stroke="#f0e9df" strokeDasharray="3 3" />
              <text x="40" y="24" textAnchor="end" fontSize="10" fill="#94a3b8">₹40L</text>

              <line x1="45" y1="60" x2="440" y2="60" stroke="#f0e9df" strokeDasharray="3 3" />
              <text x="40" y="64" textAnchor="end" fontSize="10" fill="#94a3b8">₹30L</text>

              <line x1="45" y1="100" x2="440" y2="100" stroke="#f0e9df" strokeDasharray="3 3" />
              <text x="40" y="104" textAnchor="end" fontSize="10" fill="#94a3b8">₹20L</text>

              <line x1="45" y1="140" x2="440" y2="140" stroke="#f0e9df" strokeDasharray="3 3" />
              <text x="40" y="144" textAnchor="end" fontSize="10" fill="#94a3b8">₹10L</text>

              <line x1="45" y1="180" x2="440" y2="180" stroke="#e2d7c9" />
              <text x="40" y="184" textAnchor="end" fontSize="10" fill="#94a3b8">0</text>

              {/* Animated Bars */}
              {revenueTrendData.map((d, i) => {
                const x = 65 + i * 48;
                const targetBarHeight = (d.revenue / 40) * 160;
                const barHeight = animated ? targetBarHeight : 0;
                const y = 180 - barHeight;
                return (
                  <g key={i} onMouseEnter={() => setHoveredBar(d)} onMouseLeave={() => setHoveredBar(null)}>
                    <rect
                      x={x}
                      y={y}
                      width="24"
                      height={barHeight}
                      rx="3"
                      fill="#0F2C59"
                      className="trend-bar-rect"
                      style={{
                        transition: `height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s, y 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s`
                      }}
                    />
                    <text x={x + 12} y="196" textAnchor="middle" fontSize="11" fill="#64748b">
                      {d.month}
                    </text>
                  </g>
                );
              })}

              {/* Quotations Line with Drawing Animation */}
              <path
                d="M 77 155 L 125 138 L 173 112 L 221 95 L 269 90 L 317 78 L 365 65 L 413 48"
                fill="none"
                stroke="#C4943A"
                strokeWidth="2.5"
                className={`trend-line-path ${animated ? 'animate-draw-line' : ''}`}
              />

              {/* Line Node Points with Pop Animation */}
              {[
                { x: 77, y: 155 },
                { x: 125, y: 138 },
                { x: 173, y: 112 },
                { x: 221, y: 95 },
                { x: 269, y: 90 },
                { x: 317, y: 78 },
                { x: 365, y: 65 },
                { x: 413, y: 48 },
              ].map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={animated ? 4 : 0}
                  fill="#ffffff"
                  stroke="#C4943A"
                  strokeWidth="2.5"
                  className="chart-dot-node"
                  style={{
                    transition: `r 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${0.6 + i * 0.08}s`
                  }}
                />
              ))}
            </svg>

            {hoveredBar && (
              <div className="chart-hover-tooltip">
                <strong>{hoveredBar.month}</strong>: {hoveredBar.revLabel} • {hoveredBar.quotations} Quotes
              </div>
            )}
          </div>
        </div>

        {/* 3. Deal Health */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.35s' }}>
          <div className="panel-card-head">
            <h3>Deal Health</h3>
          </div>

          <div className="deal-health-donut-area">
            {/* SVG Donut with Ring Fill Animation */}
            <div className="donut-center-container">
              <svg viewBox="0 0 160 160" className="donut-svg">
                {/* Background Track */}
                <circle cx="80" cy="80" r="54" fill="none" stroke="#f1ebe2" strokeWidth="18" />
                
                {/* Stalled: 8/48 = 17% -> arc ~57 */}
                <circle
                  cx="80" cy="80" r="54" fill="none"
                  stroke="#B84A39" strokeWidth="18"
                  strokeDasharray={`${animated ? 57 : 0} 340`}
                  strokeDashoffset="0"
                  transform="rotate(-90 80 80)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.9s ease 0.1s' }}
                />

                {/* At Risk: 14/48 = 29% -> arc ~99 */}
                <circle
                  cx="80" cy="80" r="54" fill="none"
                  stroke="#DAC0A3" strokeWidth="18"
                  strokeDasharray={`${animated ? 99 : 0} 340`}
                  strokeDashoffset="-57"
                  transform="rotate(-90 80 80)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.9s ease 0.25s' }}
                />

                {/* On Track: 26/48 = 54% -> arc ~184 */}
                <circle
                  cx="80" cy="80" r="54" fill="none"
                  stroke="#1F6B56" strokeWidth="18"
                  strokeDasharray={`${animated ? 184 : 0} 340`}
                  strokeDashoffset="-156"
                  transform="rotate(-90 80 80)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.9s ease 0.4s' }}
                />
              </svg>

              {/* Center Stat */}
              <div className="donut-stat-center">
                <div className="donut-num-lg">48</div>
                <div className="donut-sub-lbl">Total Deals</div>
              </div>
            </div>

            {/* Bottom Breakdown List (Single-line per row) */}
            <div className="deal-health-breakdown">
              <div className="health-row-stat">
                <div className="health-dot-label">
                  <span className="health-dot dot-green" />
                  <span>On Track</span>
                </div>
                <div className="health-val-col">
                  <strong>26</strong> <span className="pct-sub">(54%)</span>
                </div>
              </div>

              <div className="health-row-stat">
                <div className="health-dot-label">
                  <span className="health-dot dot-sand" />
                  <span>At Risk</span>
                </div>
                <div className="health-val-col">
                  <strong>14</strong> <span className="pct-sub">(29%)</span>
                </div>
              </div>

              <div className="health-row-stat">
                <div className="health-dot-label">
                  <span className="health-dot dot-red" />
                  <span>Stalled</span>
                </div>
                <div className="health-val-col">
                  <strong>8</strong> <span className="pct-sub">(17%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Top Products | Quotations by Status | Warehouse Utilization ─── */}
      <div className="dash-row-grid row-3-cols">
        {/* 1. Top Products by Revenue */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.4s' }}>
          <div className="panel-card-head">
            <h3>Top Products by Revenue</h3>
            <div className="panel-filter-pill">
              <span>{productFilter}</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="products-progress-list">
            {topProducts.map((p, i) => (
              <div key={i} className="prod-progress-item">
                <div className="prod-name-lbl">{p.name}</div>
                <div className="prod-track-container">
                  <div className="prod-track-bg">
                    <div
                      className="prod-bar-fill"
                      style={{ 
                        width: animated ? `${p.widthPct}%` : '0%', 
                        backgroundColor: p.color,
                        transition: `width 0.9s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + i * 0.1}s`
                      }}
                    />
                  </div>
                </div>
                <div className="prod-amount-val font-mono">{p.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Quotations by Status (Donut) */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.45s' }}>
          <div className="panel-card-head">
            <h3>Quotations by Status</h3>
          </div>

          <div className="status-donut-card-layout">
            <div className="status-donut-left">
              <svg viewBox="0 0 150 150" className="donut-svg-sm">
                <circle cx="75" cy="75" r="50" fill="none" stroke="#f1ebe2" strokeWidth="18" />
                
                {/* Won: 5 (10%) */}
                <circle
                  cx="75" cy="75" r="50" fill="none"
                  stroke="#1E7E34" strokeWidth="18"
                  strokeDasharray={`${animated ? 31 : 0} 314`}
                  strokeDashoffset="0"
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.8s ease 0.1s' }}
                />

                {/* Negotiation: 9 (19%) */}
                <circle
                  cx="75" cy="75" r="50" fill="none"
                  stroke="#C4A882" strokeWidth="18"
                  strokeDasharray={`${animated ? 60 : 0} 314`}
                  strokeDashoffset="-31"
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.8s ease 0.2s' }}
                />

                {/* Sent: 14 (29%) */}
                <circle
                  cx="75" cy="75" r="50" fill="none"
                  stroke="#DAC0A3" strokeWidth="18"
                  strokeDasharray={`${animated ? 91 : 0} 314`}
                  strokeDashoffset="-91"
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.8s ease 0.3s' }}
                />

                {/* Pending: 8 (17%) */}
                <circle
                  cx="75" cy="75" r="50" fill="none"
                  stroke="#0F2C59" strokeWidth="18"
                  strokeDasharray={`${animated ? 53 : 0} 314`}
                  strokeDashoffset="-182"
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.8s ease 0.4s' }}
                />

                {/* Draft: 12 (25%) */}
                <circle
                  cx="75" cy="75" r="50" fill="none"
                  stroke="#4A749B" strokeWidth="18"
                  strokeDasharray={`${animated ? 79 : 0} 314`}
                  strokeDashoffset="-235"
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                  style={{ transition: 'stroke-dasharray 0.8s ease 0.5s' }}
                />
              </svg>

              <div className="donut-center-text-sm">
                <div className="num-bold">48</div>
                <div className="lbl-muted">Total</div>
              </div>
            </div>

            {/* Clean, single-line Legend */}
            <div className="status-legend-right">
              <div className="status-legend-item">
                <div className="legend-label-wrap">
                  <span className="dot" style={{ backgroundColor: '#4A749B' }} />
                  <span className="lbl">Draft</span>
                </div>
                <div className="legend-value-wrap">
                  <strong>12</strong> <span className="pct">(25%)</span>
                </div>
              </div>

              <div className="status-legend-item">
                <div className="legend-label-wrap">
                  <span className="dot" style={{ backgroundColor: '#0F2C59' }} />
                  <span className="lbl">Pending Approval</span>
                </div>
                <div className="legend-value-wrap">
                  <strong>8</strong> <span className="pct">(17%)</span>
                </div>
              </div>

              <div className="status-legend-item">
                <div className="legend-label-wrap">
                  <span className="dot" style={{ backgroundColor: '#DAC0A3' }} />
                  <span className="lbl">Sent to Customer</span>
                </div>
                <div className="legend-value-wrap">
                  <strong>14</strong> <span className="pct">(29%)</span>
                </div>
              </div>

              <div className="status-legend-item">
                <div className="legend-label-wrap">
                  <span className="dot" style={{ backgroundColor: '#C4A882' }} />
                  <span className="lbl">Negotiation</span>
                </div>
                <div className="legend-value-wrap">
                  <strong>9</strong> <span className="pct">(19%)</span>
                </div>
              </div>

              <div className="status-legend-item">
                <div className="legend-label-wrap">
                  <span className="dot" style={{ backgroundColor: '#1E7E34' }} />
                  <span className="lbl">Won</span>
                </div>
                <div className="legend-value-wrap">
                  <strong>5</strong> <span className="pct">(10%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Warehouse Utilization */}
        <div className="dash-panel-card animated-card" style={{ animationDelay: '0.5s' }}>
          <div className="panel-card-head">
            <h3>Warehouse Utilization</h3>
          </div>

          <div className="wh-utilization-list">
            {warehouses.map((wh, i) => (
              <div key={i} className="wh-util-row">
                <div className="wh-name-cell">{wh.name}</div>
                <div className="wh-pct-cell font-mono">{wh.pct}%</div>
                <div className="wh-bar-cell">
                  <div className="wh-track-bg">
                    <div
                      className="wh-fill-bar"
                      style={{ 
                        width: animated ? `${wh.pct}%` : '0%', 
                        backgroundColor: wh.color,
                        transition: `width 0.9s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + i * 0.08}s`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Row 4: Recent Deals (Full Width) ─── */}
      <div className="dash-panel-card animated-card" style={{ animationDelay: '0.55s' }}>
        <div className="panel-card-head">
          <h3>Recent Deals</h3>
          <button className="view-all-link" onClick={() => navigate('/pipeline')}>
            View All <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="exact-deals-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Value</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map((deal, i) => (
                <tr key={i}>
                  <td className="font-mono deal-num-cell">{deal.id}</td>
                  <td className="font-bold">{deal.customer}</td>
                  <td className="font-mono font-bold deal-val-cell">{deal.value}</td>
                  <td>
                    <span className={`deal-status-pill ${deal.statusStyle}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="text-muted">{deal.stage}</td>
                  <td className="text-muted">{deal.activity}</td>
                  <td>
                    <button className="action-dots-btn" title="Options">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
