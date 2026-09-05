/**
 * RiskBar — visual indicator for discount risk relative to category limits.
 * 
 * Props:
 *   discountPct    - The actual discount percentage applied
 *   categoryLimit  - The maximum allowed discount for this category
 *   financeThreshold - The finance escalation threshold (blended score)
 *   label          - Label text (e.g., product name or "Blended")
 *   isBlended      - If true, styles as the blended/summary bar
 */
export default function RiskBar({ discountPct = 0, categoryLimit = 10, financeThreshold = 5, label = '', isBlended = false }) {
  // Calculate fill percentage (capped at 150% for visual overflow)
  const ratio = categoryLimit > 0 ? discountPct / categoryLimit : 0;
  const fillPct = Math.min(150, ratio * 100);

  // Determine zone
  const overage = Math.max(0, discountPct - categoryLimit);
  let zone = 'green';
  if (overage > 0 && overage < financeThreshold) zone = 'amber';
  if (overage >= financeThreshold) zone = 'red';

  // For blended bar, use the score directly
  if (isBlended) {
    if (discountPct === 0) zone = 'green';
    else if (discountPct < financeThreshold) zone = 'amber';
    else zone = 'red';
  }

  return (
    <div className={`risk-bar ${isBlended ? 'risk-bar--blended' : ''}`}>
      {label && <span className="risk-bar__label">{label}</span>}
      <div className="risk-bar__track">
        <div
          className={`risk-bar__fill risk-bar__fill--${zone}`}
          style={{ width: `${Math.min(fillPct, 100)}%` }}
        />
        {/* Overflow indicator for >100% */}
        {fillPct > 100 && (
          <div
            className="risk-bar__overflow"
            style={{ width: `${Math.min(fillPct - 100, 50)}%` }}
          />
        )}
        {/* Category limit marker at 100% */}
        <div className="risk-bar__marker" style={{ left: '66.67%' }} title="Category Limit" />
      </div>
      <span className={`risk-bar__value risk-bar__value--${zone}`}>
        {discountPct.toFixed(1)}%
        {!isBlended && <span className="risk-bar__limit"> / {categoryLimit}%</span>}
      </span>
    </div>
  );
}
