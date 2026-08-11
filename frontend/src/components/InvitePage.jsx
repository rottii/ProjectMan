import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6', // light gray
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
    backgroundColor: '#4F46E5', // indigo-600
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
  loadingBox: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280'
  }
};

export default function InvitePage({ token, setToken, setUser, currentUser, authToken }) {
  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    // Fetch invite info to show who invited them and to what workspace
    const fetchInviteInfo = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInviteInfo(data);
      } catch (err) {
        setError(err.message || 'Invalid or expired invite link.');
      } finally {
        setLoading(false);
      }
    };
    fetchInviteInfo();
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify(authToken ? {} : formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to accept invite');
      
      if (!authToken) {
        // Successfully accepted invite and registered
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
      }
      
      // Redirect to workspace
      window.location.href = `/workspace/${data.workspaceId}`;
      
    } catch (err) {
      setError(err.message || 'Failed to accept invite.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>Validating invite link...</div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
           <div style={styles.logo}>
             <span style={{color: '#4F46E5'}}>●</span> Asana Clone
           </div>
           <h2 style={styles.title}>Invalid Invite</h2>
           <p style={styles.subtitle}>{error}</p>
           <a href="/" style={{color: '#4F46E5', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500'}}>Go to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{color: '#4F46E5'}}>●</span> Asana Clone
        </div>
        
        <h2 style={styles.title}>You've been invited!</h2>
        <p style={styles.subtitle}>
          <strong>{inviteInfo.invitedBy}</strong> has invited you to join the <strong>{inviteInfo.workspaceName}</strong> workspace.
        </p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        {currentUser ? (
           <form style={styles.form} onSubmit={handleSubmit}>
             <p style={{fontSize: '0.95rem', color: '#374151', marginBottom: '1rem'}}>
               You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.email}).
             </p>
             <button style={styles.button} type="submit" disabled={submitting}>
               {submitting ? 'Joining...' : 'Join Workspace'}
             </button>
           </form>
        ) : (
          <form style={styles.form} onSubmit={handleSubmit}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                style={styles.input} 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="e.g. Jane Doe"
              />
            </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              style={styles.input} 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              placeholder="name@company.com"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              style={styles.input} 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              minLength={6}
            />
          </div>
          
          <button style={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Accept Invite & Join'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
