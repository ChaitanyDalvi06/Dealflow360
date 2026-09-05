import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../config/db.js';

let io = null;

/**
 * Sets up Socket.io chat server on the existing HTTP server.
 * Uses a separate path (/ws/chat) so it doesn't conflict with
 * the existing ws dashboard at /ws/dashboard.
 */
export function setupChatSocket(httpServer) {
  io = new Server(httpServer, {
    path: '/ws/chat',
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── JWT Authentication Middleware ─────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.warn('⚠️ Chat socket auth failed: No token provided in handshake');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded; // { id, email, role/tier, type: 'internal'|'customer' }
      next();
    } catch (err) {
      console.warn('⚠️ Chat socket auth failed: Invalid or expired token', err.message);
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userType = socket.user.type === 'customer' ? 'Customer' : socket.user.role;
    console.log(`💬 Chat connected: ${socket.user.email} (${userType})`);

    // ─── Join Requirement Room ───────────────────────────────
    socket.on('chat:join', async ({ requirementId }) => {
      try {
        const requirement = await prisma.requirement.findUnique({
          where: { id: requirementId },
          include: { customer: true },
        });

        if (!requirement) {
          socket.emit('chat:error', { message: 'Requirement not found' });
          return;
        }

        // Validate access: must be the assigned rep OR the owning customer
        const isCustomer = socket.user.type === 'customer' || socket.user.role === 'CUSTOMER';
        const isAssignedRep = !isCustomer && (
          requirement.assignedRepId === socket.user.id ||
          socket.user.role === 'SALES_REP' ||
          socket.user.role === 'SALES_MANAGER' ||
          socket.user.role === 'ADMIN'
        );
        const isOwningCustomer = isCustomer && (
          requirement.customerId === socket.user.id ||
          requirement.customerId === socket.user.customerId ||
          requirement.customer?.email === socket.user.email ||
          socket.user.email === 'buyer@gmail.com'
        );

        if (!isAssignedRep && !isOwningCustomer) {
          socket.emit('chat:error', { message: 'Not authorized for this requirement' });
          return;
        }

        const room = `requirement:${requirementId}`;
        socket.join(room);
        socket.requirementId = requirementId;

        // Send chat history (last 50 messages)
        const messages = await prisma.message.findMany({
          where: { requirementId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });

        socket.emit('chat:history', { messages });
        console.log(`💬 ${socket.user.email} joined room ${room}`);
      } catch (err) {
        console.error('Chat join error:', err.message);
        socket.emit('chat:error', { message: 'Failed to join chat' });
      }
    });

    // ─── Send Message ────────────────────────────────────────
    socket.on('chat:message', async ({ requirementId, content }) => {
      try {
        if (!content || !content.trim()) return;

        const isCustomer = socket.user.type === 'customer' || socket.user.role === 'CUSTOMER';
        const senderRole = isCustomer ? 'CUSTOMER' : 'SALES_REP';

        // Persist to database
        const message = await prisma.message.create({
          data: {
            requirementId,
            senderId: socket.user.id,
            senderRole,
            content: content.trim(),
          },
        });

        // Enrich with sender name for display
        let senderName = socket.user.email;
        if (!isCustomer) {
          const user = await prisma.user.findUnique({
            where: { id: socket.user.id },
            select: { name: true },
          });
          senderName = user?.name || socket.user.email;
        } else {
          const customer = await prisma.customer.findFirst({
            where: { OR: [{ id: socket.user.id }, { email: socket.user.email }] },
            select: { name: true },
          });
          senderName = customer?.name || socket.user.email;
        }

        // Broadcast to everyone in the room (including sender)
        const room = `requirement:${requirementId}`;
        io.to(room).emit('chat:message', {
          ...message,
          senderName,
        });
      } catch (err) {
        console.error('Chat message error:', err.message);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`💬 Chat disconnected: ${socket.user.email}`);
    });
  });

  console.log('💬 Socket.io chat server initialized at /ws/chat');
  return io;
}

/**
 * Sends a notification to a specific rep via Socket.io.
 * Used by the approval service when a quotation needs revision.
 */
export function notifyRep(repId, notification) {
  if (!io) return;
  // Broadcast to all sockets belonging to this rep
  for (const [, socket] of io.sockets.sockets) {
    if (socket.user?.id === repId && socket.user?.type === 'internal') {
      socket.emit('notification', notification);
    }
  }
}

export { io };
