import React, { useState } from 'react';
import { apiFetch } from '../api';

export default function EmailVerificationBanner({ token, user, setUser }) {
  const [status, setStatus] = useState('idle'); // 'idle', 'sending', 'sent', 'error'
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setStatus('sending');
    try {
      const res = await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-tertiary)',
      borderBottom: '1px solid #C7D2FE',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#3730A3',
      zIndex: 1000,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '16px' }}>✉️</span>
      <span>
        {status === 'sent'
          ? `Verification email sent to ${user?.email}! Check your inbox.`
          : `Please verify your email (${user?.email}) to receive notifications.`
        }
      </span>
      {status !== 'sent' && (
        <button
          onClick={handleResend}
          disabled={status === 'sending'}
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            marginLeft: '4px',
            opacity: status === 'sending' ? 0.7 : 1,
          }}
        >
          {status === 'sending' ? 'Sending...' : 'Resend verification email'}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6366F1',
          cursor: 'pointer',
          fontSize: '18px',
          marginLeft: '8px',
          padding: '0 4px',
          lineHeight: 1,
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
