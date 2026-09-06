/**
 * Format currency in INR
 */
export function formatCurrency(amount, currency = 'INR') {
  const localeMap = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };
  return new Intl.NumberFormat(localeMap[currency] || 'en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(amount || 0);
}

/**
 * Format percentage
 */
export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}
export const formatPct = formatPercent;

/**
 * Format date
 */
export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Quotation status labels and badge classes
 */
export const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', badge: 'badge-secondary' },
  SENT: { label: 'Sent', badge: 'badge-info' },
  NEGOTIATING: { label: 'Negotiating', badge: 'badge-warning' },
  UNDER_NEGOTIATION: { label: 'Negotiating', badge: 'badge-warning' },
  PENDING_APPROVAL: { label: 'In Approval Chain', badge: 'badge-warning' },
  PENDING_MANAGER: { label: 'Awaiting Manager', badge: 'badge-warning' },
  PENDING_FINANCE: { label: 'Awaiting Finance', badge: 'badge-warning' },
  APPROVED: { label: 'Approved', badge: 'badge-success' },
  REJECTED: { label: 'Rejected', badge: 'badge-danger' },
  CONFIRMED: { label: 'Confirmed', badge: 'badge-success' },
  INVOICED: { label: 'Invoiced', badge: 'badge-primary' },
  PAID: { label: 'Paid', badge: 'badge-success' },
  CANCELLED: { label: 'Cancelled', badge: 'badge-danger' },
};

/**
 * Status badge class resolver
 */
export function getStatusBadgeClass(status) {
  if (!status) return 'badge-secondary';
  const s = status.toUpperCase();
  if (s.includes('APPROV') || s === 'CONFIRMED' || s === 'PAID') return 'badge-success';
  if (s.includes('PENDING') || s.includes('NEGOTIAT')) return 'badge-warning';
  if (s.includes('REJECT') || s.includes('CANCEL') || s.includes('HIGH')) return 'badge-danger';
  if (s === 'GOLD' || s === 'PLATINUM') return 'badge-primary';
  if (s === 'SILVER') return 'badge-info';
  return 'badge-secondary';
}

/**
 * Risk badge class resolver
 */
export function getRiskBadgeClass(riskLevel) {
  if (!riskLevel) return 'badge-secondary';
  const r = riskLevel.toUpperCase();
  if (r === 'LOW') return 'badge-success';
  if (r === 'MEDIUM') return 'badge-warning';
  if (r === 'HIGH' || r === 'CRITICAL') return 'badge-danger';
  return 'badge-secondary';
}

/**
 * Tier badge config
 */
export const TIER_CONFIG = {
  STANDARD: { label: 'Standard', badge: 'badge-secondary' },
  BRONZE: { label: 'Bronze', badge: 'badge-secondary' },
  SILVER: { label: 'Silver', badge: 'badge-info' },
  GOLD: { label: 'Gold', badge: 'badge-primary' },
  PLATINUM: { label: 'Platinum', badge: 'badge-primary' },
};
