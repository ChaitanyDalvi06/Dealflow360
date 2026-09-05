/**
 * WebSocket server for the Deal Health dashboard.
 * Pushes real-time updates to connected clients.
 * Falls back to polling via REST if WebSocket fails.
 */

const clients = new Set();

export function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('📡 Dashboard client connected');
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
      console.log('📡 Dashboard client disconnected');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() }));
  });

  console.log('📡 WebSocket server initialized for dashboard');
}

/**
 * Broadcasts a message to all connected dashboard clients.
 */
export function broadcastToDashboard(eventType, data) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    } catch (err) {
      console.error('Failed to send to dashboard client:', err.message);
    }
  }
}
