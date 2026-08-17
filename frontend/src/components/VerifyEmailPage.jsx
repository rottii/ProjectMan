import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827'
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: 1.5
  },
  button: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.2s'
  },
  error: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '1rem'
  },
  success: {
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '1rem',
    borderRadius: '6px',
    fontSize: '0.95rem',
    marginBottom: '1rem'
  }
};

export default function VerifyEmailPage({ token, onVerified }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await apiFetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          if (onVerified) onVerified();
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Verification failed.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('An error occurred while verifying your email.');
      }
    };

    verify();
  }, [token]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{ color: 'var(--accent-primary)' }}>●</span>
          {t("asana_clone", "ProjectMan")}
        </div>

        {status === 'loading' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: 'var(--bg-tertiary)' }}>⏳</div>
            <h2 style={styles.title}>{t("verifying_email", "Verifying your email...")}</h2>
            <p style={styles.subtitle}>{t("please_wait", "Please wait a moment.")}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: '#d1fae5' }}>✓</div>
            <div style={styles.success}>
              {t("email_verified_success", "Your email has been verified successfully!")}
            </div>
            <p style={styles.subtitle}>
              {t("email_verified_desc", "You will now receive email notifications for task assignments, comments, and reminders.")}
            </p>
            <a href="/" style={styles.button}>
              {t("go_to_app", "Go to App")}
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fee2e2' }}>✕</div>
            <h2 style={styles.title}>{t("verification_failed", "Verification Failed")}</h2>
            <div style={styles.error}>{errorMsg}</div>
            <p style={styles.subtitle}>
              {t("verification_failed_desc", "The link may have expired. You can request a new verification email from Settings.")}
            </p>
            <a href="/" style={styles.button}>
              {t("go_to_app", "Go to App")}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
