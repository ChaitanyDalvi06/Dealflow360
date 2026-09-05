import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

const NotificationContext = createContext(null);

// Web Audio API chime generator for pleasant notification sound without external files
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Note 1 (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (G#5 / celebration chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio autoplay might be blocked before first user click
  }
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('df360_token') || localStorage.getItem('df360_portal_token');
      if (!token) return;
      const res = await api.get('/notifications');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      }
    } catch (err) {
      // Ignore if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();

    const token = localStorage.getItem('df360_token') || localStorage.getItem('df360_portal_token');
    if (token) {
      const socket = io('http://localhost:3001', {
        path: '/ws/chat',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('notification', (data) => {
        playNotificationChime();
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setToast({
          id: Date.now(),
          title: data.title || 'Notification',
          message: data.message,
          type: data.type || 'INFO',
          quotationId: data.quotationId,
        });
      });

      socket.on('quotation:approved', (data) => {
        playNotificationChime();
        const quoteLabel = data.quoteNumber || ('QT-' + (data.quotationId || '').slice(-6).toUpperCase());
        const amountStr = Number(data.orderTotal || 0).toLocaleString('en-IN');
        
        setToast({
          id: Date.now(),
          title: '🎉 Quotation Approved by Finance!',
          message: `${quoteLabel} (${data.customerName || 'Customer'}) for ₹${amountStr} is officially approved and ready!`,
          type: 'APPROVAL_APPROVED',
          quotationId: data.quotationId,
        });

        // Dispatch window event so any open view (ApprovalPage, PipelinePage, WorkspacePage, PortalDashboard) can update immediately
        window.dispatchEvent(new CustomEvent('df360:quotation:approved', { detail: data }));
        fetchNotifications();
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toast,
        setToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
      {/* Floating Global Toast Banner */}
      {toast && (
        <div className="global-toast-container">
          <div className="global-toast-card">
            <div className="global-toast-accent-bar" />
            <div className="global-toast-content">
              <div className="global-toast-header">
                <strong>{toast.title}</strong>
                <button
                  className="global-toast-close"
                  onClick={() => setToast(null)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
              <p className="global-toast-body">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      toast: null,
      setToast: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      refreshNotifications: () => {},
    };
  }
  return ctx;
}

export default NotificationContext;
