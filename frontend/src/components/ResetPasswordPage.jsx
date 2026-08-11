import { useTranslation } from "react-i18next";
import React, { useState } from 'react';
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    // light gray
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    width: '100%',
    maxWidth: '400px',
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
    color: '#111827' // dark gray
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#4F46E5',
    // indigo-600
    color: 'white',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.5rem',
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
export default function ResetPasswordPage({
  token
}) {
  const {
    t
  } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link might be invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };
  if (success) {
    return <div style={styles.container}>
        <div style={styles.card}>
           <div style={styles.logo}>
             <span style={{
            color: '#4F46E5'
          }}>●</span>{t("asana_clone", "Asana Clone")}</div>
           <div style={styles.success}>{t("your_password_has_been_successfully_reset", "Your password has been successfully reset!")}</div>
           <a href="/" style={{
          ...styles.button,
          display: 'inline-block',
          textDecoration: 'none',
          boxSizing: 'border-box'
        }}>{t("return_to_login", "Return to Login")}</a>
        </div>
      </div>;
  }
  return <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{
          color: '#4F46E5'
        }}>●</span>{t("asana_clone", "Asana Clone")}</div>
        
        <h2 style={styles.title}>{t("reset_your_password", "Reset Your Password")}</h2>
        <p style={styles.subtitle}>{t("please_enter_your_new_password_below", "Please enter your new password below.")}</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form style={styles.form} onSubmit={handleSubmit}>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("new_password", "New Password")}</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("confirm_new_password", "Confirm New Password")}</label>
            <input style={styles.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          
          <button style={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>;
}