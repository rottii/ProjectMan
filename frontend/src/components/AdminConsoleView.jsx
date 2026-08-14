import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';

const styles = {
  container: {
    padding: '1.5rem 3rem',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '1rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  tabsContainer: {
    display: 'flex',
    gap: '2rem',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '1.5rem'
  },
  tab: {
    padding: '0.75rem 0',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  },
  activeTab: {
    padding: '0.75rem 0',
    cursor: 'pointer',
    borderBottom: '2px solid var(--primary-color, #4F46E5)',
    color: 'var(--primary-color, #4F46E5)',
    fontWeight: '500',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  },
  card: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--bg-primary)',
    zIndex: 10
  },
  td: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
    verticalAlign: 'middle',
    color: 'var(--text-primary)'
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  name: {
    fontWeight: '500',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    marginBottom: '0.2rem'
  },
  email: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem'
  },
  select: {
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer'
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  removeBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #f87171'
  },
  loadingBox: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  },
  metricCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    flex: '1',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  metricTitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  metricValue: {
    color: 'var(--text-primary)',
    fontSize: '2rem',
    fontWeight: '600',
    margin: 0
  }
};

export default function AdminConsoleView({
  workspaceId,
  token,
  currentUser
}) {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteLinkToken, setInviteLinkToken] = useState(null);
  const [resetLinkToken, setResetLinkToken] = useState(null);

  const [settingsName, setSettingsName] = useState('');
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [totalAuditPages, setTotalAuditPages] = useState(1);
  const [auditLogLimit, setAuditLogLimit] = useState(10);

  useEffect(() => {
    fetchMembersAndWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    if (activeTab === 'audit_logs') fetchAuditLogs();
  }, [activeTab, workspaceId, auditLogPage, auditLogLimit]);

  const fetchMembersAndWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/workspaces/${workspaceId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch members');
      setMembers(data);

      const wsRes = await apiFetch(`/api/workspaces`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const currentWs = wsData.find(w => w.id === workspaceId);
        if (currentWs) {
          setWorkspace(currentWs);
          setSettingsName(currentWs.name);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, workspaceId]);

  const fetchAuditLogs = async () => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/audit-logs?page=${auditLogPage}&limit=${auditLogLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || data);
        setTotalAuditPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await apiFetch(`/api/invites/workspaces/${workspaceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxUses: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteLinkToken(data.token);
    } catch (err) {
      alert(`Error generating invite link: ${err.message}`);
    }
  };

  const handleGenerateResetLink = async targetUserId => {
    try {
      const res = await apiFetch(`/api/auth/generate-reset-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId, workspaceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetLinkToken(data.token);
    } catch (err) {
      alert(`Error generating reset link: ${err.message}`);
    }
  };

  const copyToClipboard = text => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(members.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  const handleToggleSuspend = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(members.map(m => m.userId === userId ? { ...m, isActive: newStatus } : m));
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (userName === 'yourself') {
      if (!window.confirm(`Are you sure you want to leave this workspace? You will lose access to all projects and teams.`)) return;
    } else {
      if (!window.confirm(`Are you sure you want to completely remove ${userName} from the workspace? They will lose access to all projects and teams.`)) return;
    }
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(members.filter(m => m.userId !== userId));
    } catch (err) {
      alert(`Error removing member: ${err.message}`);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: settingsName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Workspace updated successfully.');
      window.location.reload();
    } catch (err) {
      alert(`Error updating workspace: ${err.message}`);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!window.confirm("WARNING: Are you absolutely sure you want to delete this entire workspace? This will permanently delete all projects, teams, tasks, and data within it. This action CANNOT be undone.")) return;
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Workspace deleted successfully. Please refresh the page.");
      window.location.reload();
    } catch (err) {
      alert(`Error deleting workspace: ${err.message}`);
    }
  };

  if (loading) return <div style={styles.loadingBox}>{t("loading", "Loading...")}</div>;
  if (error) return <div style={styles.container}><div style={styles.errorBox}><strong>{t("error", "Error:")}</strong> {error}</div></div>;

  const myMemberRecord = members.find(m => m.userId === currentUser?.id);
  const oldestAdmin = [...members].filter(m => m.role === 'ADMIN').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  const isOriginalAdmin = oldestAdmin && myMemberRecord && oldestAdmin.userId === myMemberRecord.userId;

  return (
    <div style={styles.container}>
      <div style={{ ...styles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={styles.title}>{t("workspace_admin_panel", "Workspace Admin Panel")}</h1>
          <p style={styles.subtitle}>{t("manage_workspace_settings_desc", "Manage members, settings, and view workspace analytics and logs.")}</p>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <div style={activeTab === 'members' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('members')}>Members</div>
        {myMemberRecord?.role === 'ADMIN' && (
          <>
            <div style={activeTab === 'settings' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('settings')}>Settings</div>
            <div style={activeTab === 'audit_logs' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('audit_logs')}>Audit Logs</div>
            <div style={activeTab === 'analytics' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('analytics')}>Analytics</div>
          </>
        )}
      </div>

      {activeTab === 'members' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={handleGenerateInvite} style={{
              backgroundColor: 'var(--primary-color, #4F46E5)', color: 'white', border: 'none',
              borderRadius: '6px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer'
            }}>
              {t("generate_invite_link", "Generate Invite Link")}
            </button>
          </div>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t("member", "Member")}</th>
                  <th style={styles.th}>{t("role", "Role")}</th>
                  <th style={styles.th}>{t("status", "Status")}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>{t("actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => {
                  const isMe = member.userId === currentUser?.id;
                  const isAdmin = myMemberRecord?.role === 'ADMIN';
                  const isOlderAdmin = !isMe && isAdmin && member.role === 'ADMIN' && new Date(member.createdAt) < new Date(myMemberRecord.createdAt);
                  const isControlDisabled = isMe || isOlderAdmin || !isAdmin;
                  
                  return (
                    <tr key={member.userId} style={{ opacity: member.isActive ? 1 : 0.6 }}>
                      <td style={styles.td}>
                        <div style={styles.memberRow}>
                          <UserAvatar name={member.user?.name} userId={member.user?.id} profilePhoto={member.user?.profilePhoto} size={40} />
                          <div>
                            <div style={styles.name}>
                              {member.user?.name} {isMe && '(You)'} {isOlderAdmin && '(Creator)'}
                            </div>
                            <div style={styles.email}>{member.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <select 
                          style={isControlDisabled ? { ...styles.select, cursor: 'not-allowed' } : styles.select} 
                          value={member.role} 
                          onChange={e => handleRoleChange(member.userId, e.target.value)} 
                          disabled={isControlDisabled}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="GUEST">Guest</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500',
                          backgroundColor: member.isActive ? 'var(--bg-secondary)' : '#fee2e2',
                          color: member.isActive ? 'var(--text-secondary)' : '#991b1b'
                        }}>
                          {member.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {!isMe && isAdmin && (
                          <button style={styles.actionBtn} onClick={() => handleGenerateResetLink(member.userId)} title={t("reset_password", "Reset Password")}>
                            Reset Password
                          </button>
                        )}
                        {!isMe && isAdmin && (
                          <button style={isControlDisabled ? { ...styles.actionBtn, cursor: 'not-allowed', color: 'var(--text-tertiary)' } : styles.actionBtn} 
                            disabled={isControlDisabled} 
                            onClick={() => handleToggleSuspend(member.userId, member.isActive)}>
                            {member.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                        {(isAdmin || isMe) && (
                          <button style={isControlDisabled && !isMe ? { ...styles.removeBtn, cursor: 'not-allowed', borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' } : styles.removeBtn} 
                            disabled={isControlDisabled && !isMe} 
                            onClick={() => handleRemoveMember(member.userId, isMe ? 'yourself' : member.user?.name)}>
                            {isMe ? 'Leave' : 'Remove'}
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div style={{ ...styles.card, padding: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>Workspace Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', marginBottom: '2rem' }}>
            <label style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Workspace Name</label>
            <input 
              type="text" 
              value={settingsName} 
              onChange={e => setSettingsName(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <button onClick={handleSaveSettings} style={{
              backgroundColor: 'var(--primary-color, #4F46E5)', color: 'white', border: 'none',
              borderRadius: '6px', padding: '10px 16px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', width: 'fit-content'
            }}>
              Save Changes
            </button>
          </div>

          {isOriginalAdmin && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
              <h3 style={{ color: '#ef4444', marginTop: 0 }}>Danger Zone</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Deleting this workspace will remove all associated projects, tasks, and members. This cannot be undone.</p>
              <button onClick={handleDeleteWorkspace} style={{
                backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                borderRadius: '6px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer'
              }}>
                Delete Workspace
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit_logs' && (
        <div style={styles.card}>
          <table style={styles.table}>
              <thead>
                <tr>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Entity</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length > 0 ? auditLogs.map(log => (
                <tr key={log.id}>
                  <td style={styles.td}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={styles.td}>{log.user ? `${log.user.name} (${log.user.email})` : 'System'}</td>
                  <td style={styles.td}>{log.action}</td>
                  <td style={styles.td}>{log.entity}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: 'center', padding: '2rem' }}>
                    No recent audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rows per page:</span>
              <select 
                value={auditLogLimit} 
                onChange={(e) => {
                  setAuditLogLimit(Number(e.target.value));
                  setAuditLogPage(1);
                }}
                style={{ ...styles.select, padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            {totalAuditPages > 1 && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  disabled={auditLogPage === 1} 
                  onClick={() => setAuditLogPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '0.5rem 1rem', cursor: auditLogPage === 1 ? 'not-allowed' : 'pointer', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '6px' }}
                >
                  Previous
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Page {auditLogPage} of {totalAuditPages}
                </span>
                <button 
                  disabled={auditLogPage === totalAuditPages} 
                  onClick={() => setAuditLogPage(prev => Math.min(prev + 1, totalAuditPages))}
                  style={{ padding: '0.5rem 1rem', cursor: auditLogPage === totalAuditPages ? 'not-allowed' : 'pointer', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '6px' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Workspace Usage Stats</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={styles.metricCard}>
              <h3 style={styles.metricTitle}>Total Members</h3>
              <p style={styles.metricValue}>{analytics.membersCount}</p>
            </div>
            <div style={styles.metricCard}>
              <h3 style={styles.metricTitle}>Total Projects</h3>
              <p style={styles.metricValue}>{analytics.projectsCount}</p>
            </div>
            <div style={styles.metricCard}>
              <h3 style={styles.metricTitle}>Total Tasks</h3>
              <p style={styles.metricValue}>{analytics.tasksCount}</p>
            </div>
            <div style={styles.metricCard}>
              <h3 style={styles.metricTitle}>Completed Tasks</h3>
              <p style={styles.metricValue}>{analytics.completedTasksCount}</p>
            </div>
            <div style={styles.metricCard}>
              <h3 style={styles.metricTitle}>Completion Rate</h3>
              <p style={styles.metricValue}>{analytics.completionRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Links */}
      {inviteLinkToken && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Invite Link Generated</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Share this link with anyone you want to join the workspace. It will expire after 50 uses.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" readOnly value={`${window.location.origin}/invite/${inviteLinkToken}`} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <button onClick={() => copyToClipboard(`${window.location.origin}/invite/${inviteLinkToken}`)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Copy</button>
            </div>
            <button onClick={() => setInviteLinkToken(null)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: 'var(--primary-color, #4F46E5)', color: 'white', border: 'none', borderRadius: '4px' }}>Close</button>
          </div>
        </div>
      )}

      {resetLinkToken && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Password Reset Link Generated</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Securely share this one-time link with the user. It will expire in 24 hours.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" readOnly value={`${window.location.origin}/reset-password/${resetLinkToken}`} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <button onClick={() => copyToClipboard(`${window.location.origin}/reset-password/${resetLinkToken}`)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Copy</button>
            </div>
            <button onClick={() => setResetLinkToken(null)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: 'var(--primary-color, #4F46E5)', color: 'white', border: 'none', borderRadius: '4px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}