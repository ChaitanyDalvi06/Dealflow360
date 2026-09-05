import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MessageSquare, Send } from 'lucide-react';

/**
 * Reusable chat panel for both Sales Workspace and Customer Portal.
 * 
 * Props:
 *   requirementId - The requirement to chat about
 *   token         - JWT token for socket auth  
 *   currentUserId - Current user's ID
 *   currentUserType - 'internal' | 'customer'
 *   compact       - If true, renders a smaller panel (for sidebar use)
 */
export default function ChatPanel({ requirementId, token, currentUserId, currentUserType, compact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const effectiveToken = token || localStorage.getItem('df360_portal_token') || localStorage.getItem('df360_token');

  useEffect(() => {
    if (!requirementId || !effectiveToken) {
      if (!effectiveToken) {
        setConnectionStatus('error');
      }
      return;
    }

    setConnectionStatus('connecting');

    const socket = io('http://localhost:3001', {
      path: '/ws/chat',
      auth: { token: effectiveToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnectionStatus('connected');
      socket.emit('chat:join', { requirementId });
    });

    socket.on('chat:history', ({ messages: history }) => {
      setMessages(history || []);
    });

    socket.on('chat:message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('chat:error', ({ message }) => {
      console.error('Chat error:', message);
    });

    socket.on('connect_error', (err) => {
      console.warn('Chat connect_error:', err.message);
      setConnected(false);
      setConnectionStatus('error');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [requirementId, effectiveToken]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit('chat:message', {
      requirementId,
      content: input.trim(),
    });
    setInput('');
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-panel ${compact ? 'chat-panel--compact' : ''}`}>
      <div className="chat-panel__header">
        <MessageSquare size={16} />
        <span>Live Chat</span>
        <span className={`chat-panel__status ${connected ? 'chat-panel__status--connected' : connectionStatus === 'error' ? 'chat-panel__status--error' : ''}`}>
          {connected ? '● Live' : connectionStatus === 'error' ? '● Disconnected' : '○ Connecting...'}
        </span>
      </div>

      <div className="chat-panel__messages" ref={containerRef}>
        {messages.length === 0 && (
          <div className="chat-panel__empty">
            <MessageSquare size={32} style={{ opacity: 0.3 }} />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId ||
            (currentUserType === 'customer' && msg.senderRole === 'CUSTOMER') ||
            (currentUserType === 'internal' && msg.senderRole === 'SALES_REP');
          const isRep = msg.senderRole === 'SALES_REP';
          return (
            <div key={msg.id} className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
              <div className={`chat-msg__bubble ${isRep ? 'chat-msg__bubble--rep' : 'chat-msg__bubble--customer'}`}>
                <div className="chat-msg__meta">
                  <span className={`chat-msg__badge ${isRep ? 'chat-msg__badge--rep' : 'chat-msg__badge--customer'}`}>
                    {isRep ? 'Sales Rep' : 'Buyer'}
                  </span>
                  <span className="chat-msg__name">{msg.senderName || (isRep ? 'Sales Rep' : 'Customer')}</span>
                  <span className="chat-msg__time">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="chat-msg__content">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-panel__input" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={!connected}
        />
        <button type="submit" disabled={!connected || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
