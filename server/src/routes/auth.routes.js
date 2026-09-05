import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── INTERNAL SIGNUP ────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role = 'SALES_REP' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: 'internal' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ─── INTERNAL LOGIN ─────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let customerRecord = null;
    if (user.role === 'CUSTOMER') {
      customerRecord = await prisma.customer.findUnique({ where: { email } });
    }

    const tokenPayload = {
      id: customerRecord ? customerRecord.id : user.id,
      userId: user.id,
      customerId: customerRecord ? customerRecord.id : undefined,
      email: user.email,
      role: user.role,
      type: user.role === 'CUSTOMER' ? 'customer' : 'internal',
      tier: customerRecord?.tier || 'GOLD',
    };

    const token = jwt.sign(
      tokenPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      customer: customerRecord ? { id: customerRecord.id, name: customerRecord.name, email: customerRecord.email, tier: customerRecord.tier, company: customerRecord.company } : undefined,
      token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── CUSTOMER PORTAL LOGIN ─────────────────────────────────
router.post('/portal/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || !customer.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, tier: customer.tier, type: 'customer' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      customer: { id: customer.id, name: customer.name, email: customer.email, tier: customer.tier, company: customer.company },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET CURRENT USER ───────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
