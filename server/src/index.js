import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import warehouseRoutes from './routes/warehouse.routes.js';
import billingRoutes from './routes/billing.routes.js';
import portalRoutes from './routes/portal.routes.js';
import portalRequirementsRoutes from './routes/portal.requirements.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import configRoutes from './routes/config.routes.js';
import repRoutes from './routes/rep.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { setupWebSocket } from './websocket/dashboard.ws.js';
import { setupChatSocket } from './websocket/chat.ws.js';

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Request logging ────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/portal', portalRequirementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reps', repRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'DealFlow360 API' });
});

// ─── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.isDev && { stack: err.stack }),
  });
});

// ─── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── WebSocket (Dashboard) ──────────────────────────────────
const wss = new WebSocketServer({ noServer: true });
setupWebSocket(wss);

// ─── Socket.io Chat ─────────────────────────────────────────
setupChatSocket(server);

// Delegate HTTP upgrade requests based on path
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/dashboard') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // If path is /ws/chat, socket.io handles its own upgrade listeners
  } catch (err) {
    console.error('Upgrade routing error:', err.message);
  }
});

// ─── Start ──────────────────────────────────────────────────
server.listen(config.port, () => {
  console.log(`\n🚀 DealFlow360 API running on http://localhost:${config.port}`);
  console.log(`📡 WebSocket on ws://localhost:${config.port}/ws/dashboard`);
  console.log(`💬 Socket.io Chat on ws://localhost:${config.port}/ws/chat`);
  console.log(`🌍 Environment: ${config.nodeEnv}\n`);
});

export default app;
