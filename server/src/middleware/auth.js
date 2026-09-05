import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { config } from '../config/env.js';

/**
 * JWT authentication middleware.
 * Verifies the token and attaches user info to req.user
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Role-based authorization middleware.
 * Usage: authorize('ADMIN', 'SALES_MANAGER')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRole = (req.user.role || '').toUpperCase();
    const allowed = roles.flat().map(r => String(r).toUpperCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        error: `Insufficient permissions: your current role is "${req.user.role}", but this action requires: [${allowed.join(', ')}].`,
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

/**
 * Customer portal authentication middleware.
 * Verifies customer-specific JWT tokens and guarantees resolution of the Customer DB record.
 */
export async function authenticateCustomer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Portal authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'customer' && decoded.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Customer portal access only' });
    }

    // Always resolve the real Customer database record
    let customer = null;
    if (decoded.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: decoded.customerId } });
    }
    if (!customer && decoded.id) {
      customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
    }
    if (!customer && decoded.email) {
      customer = await prisma.customer.findUnique({ where: { email: decoded.email } });
    }

    if (!customer) {
      return res.status(403).json({ error: 'No associated customer account found for this user' });
    }

    req.customer = {
      ...decoded,
      id: customer.id,
      email: customer.email,
      name: customer.name,
      tier: customer.tier,
      company: customer.company,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired portal token' });
  }
}
