import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    document.title = 'DealFlow360 — Self-Governing B2B Sales Operations Platform';
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <iframe
        src="/landing.html"
        title="DealFlow360 Landing Page"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
