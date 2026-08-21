import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { apiFetch, API_BASE_URL } from '../api';
export default function Inbox({
  token,
  user,
  handleSelectProject,
  setShowSettings,
  setSettingsFocus
}) {
  const {
    t
  } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeMenu, setActiveMenu] = useState(null);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [sortOption, setSortOption] = useState('Newest');
  const [densityOption, setDensityOption] = useState('Detailed');
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({ person: '', project: '', readStatus: 'Unread', messagesStatus: { messages: true, status: true } });

  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showReadStatusDropdown, setShowReadStatusDropdown] = useState(false);
  const [showMessageStatusDropdown, setShowMessageStatusDropdown] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);

  const availablePeople = React.useMemo(() => {
    const map = new Map();
    notifications.forEach(n => {
      if (n.actor && n.actor.id) map.set(n.actor.id, n.actor);
    });
    return Array.from(map.values());
  }, [notifications]);

  const availableProjects = React.useMemo(() => {
    const map = new Map();
    notifications.forEach(n => {
      if (n.project && n.project.id) map.set(n.project.id, n.project);
    });
    return Array.from(map.values());
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setShowAddFilter(false);
      setShowReadStatusDropdown(false);
      setShowMessageStatusDropdown(false);
      setActiveFilterDropdown(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleFilter = (filter) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'From person': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> {t("from_person", "From person")}</>;
      case 'Read status':
      case 'Unread only': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> {t("read_status", "Read status")}</>;
      case 'For me': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> {t("for_me", "For me")}</>;
      case 'Assigned by':
      case 'Assigned by me': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> {t("assigned_by", "Assigned by")}</>;
      case 'Assigned to me': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> {t("assigned_to", "Assigned to")}</>;
      case 'Messages & status updates': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> {t("messages_status", "Messages & status ...")}</>;
      case 'In project':
      case 'From project': return <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {t("from_project", "From project")}</>;
      case 'Mentioned':
      case 'Mentioned me': return <>@ {t("mentioned", "Mentioned")}</>;
      default: return filter;
    }
  };

  const getFilterValueDisplay = (filter) => {
    switch (filter) {
      case 'From person': return (
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder={t("enter_person_name", "Enter person name...")}
            value={filterValues.person}
            onChange={e => setFilterValues(prev => ({ ...prev, person: e.target.value }))}
            onFocus={() => setShowPersonDropdown(true)}
            onBlur={() => setTimeout(() => setShowPersonDropdown(false), 200)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)' }}
          />
          {showPersonDropdown && (
            <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '4px', minWidth: '100%', maxHeight: '150px', overflowY: 'auto' }}>
              {availablePeople.filter(p => p.name?.toLowerCase().includes(filterValues.person.toLowerCase())).map(p => (
                <div
                  key={p.id}
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem' }}
                  onClick={() => setFilterValues(prev => ({ ...prev, person: p.name }))}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#3730A3', flexShrink: 0 }}>
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                  {p.name}
                </div>
              ))}
              {availablePeople.filter(p => p.name?.toLowerCase().includes(filterValues.person.toLowerCase())).length === 0 && (
                <div style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t("no_people", "No people found")}</div>
              )}
            </div>
          )}
        </div>
      );
      case 'In project':
      case 'From project': return (
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder={t("enter_project_name", "Enter project name...")}
            value={filterValues.project}
            onChange={e => setFilterValues(prev => ({ ...prev, project: e.target.value }))}
            onFocus={() => setShowProjectDropdown(true)}
            onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)' }}
          />
          {showProjectDropdown && (
            <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '4px', minWidth: '100%', maxHeight: '150px', overflowY: 'auto' }}>
              {availableProjects.filter(p => p.name?.toLowerCase().includes(filterValues.project.toLowerCase())).map(p => (
                <div
                  key={p.id}
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem' }}
                  onClick={() => setFilterValues(prev => ({ ...prev, project: p.name }))}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: p.color || '#E0E7FF', flexShrink: 0 }}></div>
                  {p.name}
                </div>
              ))}
              {availableProjects.filter(p => p.name?.toLowerCase().includes(filterValues.project.toLowerCase())).length === 0 && (
                <div style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t("no_projects", "No projects found")}</div>
              )}
            </div>
          )}
        </div>
      );
      case 'Read status':
        return (
          <div style={{ position: 'relative', width: '100%' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: 'var(--text-primary)' }}
              onClick={(e) => { e.stopPropagation(); setShowReadStatusDropdown(!showReadStatusDropdown); }}
            >
              <span>{filterValues.readStatus === 'Read' ? t("read", "Read") : t("unread", "Unread")}</span>
              <span style={{ color: 'var(--text-secondary)' }}>⌄</span>
            </div>
            {showReadStatusDropdown && (
              <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '8px', minWidth: '100%' }}>
                <div
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem' }}
                  onClick={(e) => { e.stopPropagation(); setFilterValues(prev => ({ ...prev, readStatus: 'Unread' })); setShowReadStatusDropdown(false); }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {t("unread", "Unread")}
                </div>
                <div
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem' }}
                  onClick={(e) => { e.stopPropagation(); setFilterValues(prev => ({ ...prev, readStatus: 'Read' })); setShowReadStatusDropdown(false); }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {t("read", "Read")}
                </div>
              </div>
            )}
          </div>
        );
      case 'Unread only': return <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: 'var(--text-tertiary, #9CA3AF)' }}><span>{t("unread", "Unread")}</span> <span style={{ color: 'var(--text-tertiary, #9CA3AF)' }}>⌄</span></div>;
      case 'For me': return <span style={{ color: 'var(--text-tertiary, #9CA3AF)' }}>{t("mentions_and_tasks_for_me", "@Mentions and tasks assigned to me")}</span>;
      case 'Assigned by':
      case 'Assigned by me': return <span style={{ color: 'var(--text-tertiary, #9CA3AF)' }}>{t("me_dynamic", "Me (dynamic)")}</span>;
      case 'Assigned to me': return <span style={{ color: 'var(--text-tertiary, #9CA3AF)' }}>{t("me_dynamic", "Me (dynamic)")}</span>;
      case 'Messages & status updates': 
        const displayValue = filterValues.messagesStatus.messages && filterValues.messagesStatus.status ? "Messages Status updates" : filterValues.messagesStatus.messages ? "Messages" : filterValues.messagesStatus.status ? "Status updates" : "—";
        return (
          <div style={{ position: 'relative', width: '100%' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: 'var(--text-primary)' }}
              onClick={(e) => { e.stopPropagation(); setShowMessageStatusDropdown(!showMessageStatusDropdown); }}
            >
              <span>{displayValue}</span>
              <span style={{ color: 'var(--text-secondary)' }}>⌄</span>
            </div>
            {showMessageStatusDropdown && (
              <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '8px', minWidth: '100%' }}>
                <div
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFilterValues(prev => ({ ...prev, messagesStatus: { ...prev.messagesStatus, messages: !prev.messagesStatus.messages } })); 
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input type="checkbox" checked={filterValues.messagesStatus.messages} readOnly style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#2563EB' }} />
                  {t("messages", "Messages")}
                </div>
                <div
                  style={{ ...styles.dropdownItem, padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFilterValues(prev => ({ ...prev, messagesStatus: { ...prev.messagesStatus, status: !prev.messagesStatus.status } })); 
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input type="checkbox" checked={filterValues.messagesStatus.status} readOnly style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#2563EB' }} />
                  {t("status_updates", "Status updates")}
                </div>
              </div>
            )}
          </div>
        );
      case 'Mentioned':
      case 'Mentioned me': return <span style={{ color: 'var(--text-tertiary, #9CA3AF)' }}>{t("me_dynamic", "Me (dynamic)")}</span>;
      default: return '';
    }
  };

  const filteredAndSortedNotifications = React.useMemo(() => {
    let result = [...notifications];

    if (activeFilters.includes('Mentioned') || activeFilters.includes('Mentioned me')) {
      result = result.filter(n => n.type === 'MENTIONED' || (n.message && n.message.includes('@')));
    }
    if (activeFilters.includes('Unread only') || activeFilters.includes('Read status')) {
      if (activeFilters.includes('Unread only') || filterValues.readStatus === 'Unread') {
        result = result.filter(n => !n.isRead);
      } else if (filterValues.readStatus === 'Read') {
        result = result.filter(n => n.isRead);
      }
    }
    if (activeFilters.includes('Assigned to me')) {
      result = result.filter(n => n.type === 'ASSIGNED');
    }
    if (activeFilters.includes('For me')) {
      result = result.filter(n => n.type === 'ASSIGNED' || n.type === 'MENTIONED' || (n.message && n.message.includes('@')));
    }
    if (activeFilters.includes('From person') && filterValues.person) {
      const lowerPerson = filterValues.person.toLowerCase();
      result = result.filter(n => n.actor?.name?.toLowerCase().includes(lowerPerson));
    }
    if ((activeFilters.includes('From project') || activeFilters.includes('In project')) && filterValues.project) {
      const lowerProject = filterValues.project.toLowerCase();
      result = result.filter(n => n.project?.name?.toLowerCase().includes(lowerProject));
    }
    if (activeFilters.includes('Messages & status updates')) {
      const showMsg = filterValues.messagesStatus.messages;
      const showStatus = filterValues.messagesStatus.status;
      if (!showMsg && !showStatus) {
         result = [];
      } else {
         result = result.filter(n => {
           const isMsg = n.type === 'MESSAGE' || n.type === 'COMMENT';
           const isStatus = n.type === 'STATUS_UPDATE' || n.isStatusUpdate;
           if (showMsg && showStatus) return isMsg || isStatus;
           if (showMsg) return isMsg;
           if (showStatus) return isStatus;
           return false;
         });
      }
    }

    if (sortOption === 'Newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortOption === 'Relevance') {
      result.sort((a, b) => {
        if (a.isRead === b.isRead) return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return a.isRead ? 1 : -1;
      });
    }
    return result;
  }, [notifications, activeFilters, sortOption, filterValues]);

  useEffect(() => {
    fetchNotifications();
    if (user && user.id) {
      const socket = io(API_BASE_URL);
      socket.emit('join_user', user.id);
      socket.on('notification_received', () => {
        fetchNotifications();
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [user]);
  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleMarkAsRead = async id => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(notifications.map(n => n.id === id ? {
        ...n,
        isRead: true
      } : n));
    } catch (error) {
      console.error(error);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(notifications.map(n => ({
        ...n,
        isRead: true
      })));
    } catch (error) {
      console.error(error);
    }
  };
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'var(--bg-primary)'
    },
    topHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.5rem 2rem 1rem 2rem'
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: '500',
      color: 'var(--text-primary)',
      margin: 0
    },
    manageBtn: {
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid #E5E7EB',
      borderRadius: '4px',
      padding: '0.4rem 0.6rem',
      fontSize: '0.75rem',
      color: 'var(--text-primary)',
      cursor: 'pointer'
    },
    tabsContainer: {
      display: 'flex',
      gap: '1.5rem',
      padding: '0 2rem',
      borderBottom: '1px solid #E5E7EB',
      color: 'var(--text-secondary)',
      fontSize: '0.85rem'
    },
    tabActive: {
      color: 'var(--text-primary)',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid var(--text-primary)',
      cursor: 'pointer'
    },
    tabInactive: {
      paddingBottom: '0.5rem',
      cursor: 'pointer',
      borderBottom: '2px solid transparent'
    },
    toolbarContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.6rem 2rem',
      borderBottom: '1px solid #E5E7EB',
      fontSize: '0.75rem',
      color: 'var(--text-secondary)'
    },
    toolbarGroup: {
      display: 'flex',
      gap: '1.2rem',
      alignItems: 'center'
    },
    toolbarBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      background: 'none',
      border: 'none',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      padding: 0,
      fontSize: '0.75rem'
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      padding: '0 2rem'
    },
    item: {
      display: 'flex',
      gap: '1rem',
      padding: densityOption === 'Compact' ? '0.5rem 0' : '1rem 0',
      borderBottom: '1px solid #E5E7EB',
      backgroundColor: 'var(--bg-primary)',
      cursor: 'pointer'
    },
    itemUnread: {
      backgroundColor: 'var(--bg-secondary)'
    },
    iconBox: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#E0E7FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.9rem',
      flexShrink: 0
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem'
    },
    message: {
      color: 'var(--text-primary)',
      fontSize: '0.9rem'
    },
    meta: {
      color: 'var(--text-secondary)',
      fontSize: '0.75rem',
      display: 'flex',
      gap: '0.5rem'
    },
    dot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: 'var(--accent-primary)',
      marginTop: '0.5rem'
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '4px',
      backgroundColor: 'var(--bg-primary, #fff)',
      border: '1px solid var(--border-color, #E5E7EB)',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 100,
      minWidth: '220px',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem 0'
    },
    dropdownItem: {
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: 'var(--text-primary)',
      fontSize: '0.85rem',
      backgroundColor: 'transparent',
      border: 'none',
      width: '100%',
      boxSizing: 'border-box',
      textAlign: 'left'
    },
    filterPopover: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '4px',
      backgroundColor: 'var(--bg-primary, #fff)',
      border: '1px solid var(--border-color, #E5E7EB)',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 100,
      minWidth: '500px',
      padding: '1.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    filterBadge: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.4rem 0.8rem',
      borderRadius: '16px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#E5E7EB',
      fontSize: '0.75rem',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      backgroundColor: 'var(--bg-primary, #fff)',
      whiteSpace: 'nowrap',
      transition: 'all 0.1s ease'
    },
    filterBadgeActive: {
      backgroundColor: '#E0E7FF',
      borderColor: '#E0E7FF',
      color: '#3730A3'
    },
    filterRowSelect: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      border: '1px solid #E5E7EB',
      fontSize: '0.85rem',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary, #fff)',
      width: '200px',
      flexShrink: 0
    },
    filterRowValue: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      border: '1px solid #E5E7EB',
      fontSize: '0.85rem',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary, #fff)',
      flex: 1
    },
    filterRowRemove: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '34px',
      height: '34px',
      borderRadius: '6px',
      border: '1px solid #E5E7EB',
      backgroundColor: 'var(--bg-primary, #fff)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'all 0.2s'
    }
  };
  const getIcon = type => {
    switch (type) {
      case 'ASSIGNED':
        return '👤';
      case 'COMPLETED':
        return '✅';
      case 'COMMENTED':
        return '💬';
      default:
        return '🔔';
    }
  };
  if (loading) return <div style={{
    padding: '2rem'
  }}>{t("loading_inbox", "Loading Inbox...")}</div>;
  return <div style={styles.container}>
    {/* 1. Top Header */}
    <div style={styles.topHeader}>
      <h1 style={styles.title}>{t("inbox", "Inbox")}</h1>
      <div style={{
        display: 'flex',
        gap: '0.5rem'
      }}>
        {notifications.some(n => !n.isRead) && <button style={{
          ...styles.manageBtn,
          border: 'none',
          color: 'var(--accent-primary)'
        }} onClick={handleMarkAllAsRead}>{t("mark_all_as_read", "Mark all as read")}</button>}
        <button style={styles.manageBtn} onClick={() => { if (setShowSettings) setShowSettings(true); if (setSettingsFocus) setSettingsFocus('Notifications'); }}>{t("manage_notifications", "Manage notifications")}</button>
      </div>
    </div>

    {/* 2. Tabs */}
    <div className="thin-scrollbar" onWheel={(e) => {
      if (e.deltaY !== 0) {
        e.currentTarget.scrollLeft += e.deltaY;
      }
    }} style={styles.tabsContainer}>
      <div style={styles.tabActive}>{t("activity", "Activity")}</div>
      <div style={styles.tabInactive}>{t("bookmarks", "Bookmarks")}</div>
      <div style={styles.tabInactive}>{t("archive", "Archive")}</div>
      <div style={styles.tabInactive}>{t("mentioned", "@Mentioned")}</div>
      <div style={styles.tabInactive}>+</div>
    </div>

    {/* 3. Toolbar */}
    <div style={styles.toolbarContainer}>
      <div style={styles.toolbarGroup}>
        <div style={{ position: 'relative' }}>
          <button
            style={{ ...styles.toolbarBtn, backgroundColor: activeMenu === 'filter' || activeFilters.length > 0 ? 'var(--bg-secondary, #F3F4F6)' : 'transparent', padding: '0.4rem 0.6rem', borderRadius: '4px' }}
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'filter' ? null : 'filter'); }}
            onMouseEnter={(e) => { if (activeMenu !== 'filter' && activeFilters.length === 0) e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'; }}
            onMouseLeave={(e) => { if (activeMenu !== 'filter' && activeFilters.length === 0) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            {t("filter", "Filter")}
            {activeFilters.length > 0 && ` (${activeFilters.length})`}
          </button>
          {activeMenu === 'filter' && (
            <div style={styles.filterPopover} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t("filters", "Filters")}</span>
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '4px', transition: 'background-color 0.1s' }}
                  onClick={() => setActiveFilters([])}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >{t("clear", "Clear")}</button>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>{t("quick_filters", "Quick filters")}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['Mentioned', 'Assigned to me', 'Assigned by me', 'Unread only', 'For me'].map(filter => (
                    <div
                      key={filter}
                      style={{
                        ...styles.filterBadge,
                        ...(activeFilters.includes(filter) ? styles.filterBadgeActive : {})
                      }}
                      onClick={() => toggleFilter(filter)}
                      onMouseEnter={e => { 
                        if(!activeFilters.includes(filter)) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)';
                        }
                      }}
                      onMouseLeave={e => { 
                        if(!activeFilters.includes(filter)) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-primary, #fff)';
                        }
                      }}
                    >
                      {activeFilters.includes(filter) ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        filter === 'Mentioned' ? <span style={{fontWeight: '500'}}>@</span> :
                        filter === 'Unread only' ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> :
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      )}
                      <span style={{ marginLeft: '0.3rem' }}>{t(filter.toLowerCase().replace(/ /g, '_'), filter)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>{t("all_filters", "All filters")}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeFilters.map(filter => (
                      <div key={filter} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
                        <div 
                          style={{...styles.filterRowSelect, cursor: 'pointer', backgroundColor: activeFilterDropdown === filter ? 'var(--bg-secondary, #F3F4F6)' : 'var(--bg-primary, #fff)', transition: 'background-color 0.1s' }}
                          onClick={(e) => { e.stopPropagation(); setActiveFilterDropdown(activeFilterDropdown === filter ? null : filter); }}
                          onMouseEnter={e => { if (activeFilterDropdown !== filter) e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)' }}
                          onMouseLeave={e => { if (activeFilterDropdown !== filter) e.currentTarget.style.backgroundColor = 'var(--bg-primary, #fff)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{getFilterLabel(filter)}</div>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>⌄</span>
                        </div>
                        {activeFilterDropdown === filter && (
                           <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '4px', minWidth: '220px' }} onClick={e => e.stopPropagation()}>
                             {['From person', 'In project', 'Messages & status updates', 'Mentioned me', 'Assigned to me', 'Assigned by me', 'Read status', 'For me'].map(item => (
                               <button
                                 key={item}
                                 style={{...styles.dropdownItem, padding: '0.4rem 0.8rem', justifyContent: 'flex-start'}}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (filter !== item && !activeFilters.includes(item)) {
                                     setActiveFilters(prev => prev.map(f => f === filter ? item : f));
                                   }
                                   setActiveFilterDropdown(null);
                                 }}
                                 onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                                 onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                               >
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                                   {getFilterLabel(item)}
                                 </div>
                               </button>
                             ))}
                           </div>
                        )}
                        <div style={styles.filterRowValue}>
                          {getFilterValueDisplay(filter)}
                        </div>
                        <button
                          style={styles.filterRowRemove}
                          onClick={() => toggleFilter(filter)}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary, #fff)'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ position: 'relative', marginTop: activeFilters.length > 0 ? '0' : '0' }}>
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: '4px', marginLeft: '-0.6rem', transition: 'background-color 0.1s' }}
                  onClick={() => setShowAddFilter(!showAddFilter)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  {t("add_filter", "Add filter")} <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>⌄</span>
                </button>
                {showAddFilter && (
                  <div style={{ ...styles.dropdownMenu, top: '100%', left: 0, marginTop: '8px', minWidth: '200px' }}>
                    {['From person', 'From project', 'Messages & status updates', 'Mentioned me', 'Assigned to me', 'Assigned by me', 'Read status', 'For me'].map(item => (
                      <button
                        key={item}
                        className="dropdown-item"
                        style={{ ...styles.dropdownItem, padding: '0.4rem 1rem' }}
                        onClick={() => { toggleFilter(item); setShowAddFilter(false); }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {item === 'Mentioned me' ? '@' :
                          item === 'Read status' ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> :
                            item === 'Messages & status updates' ? '💬' :
                              item === 'From project' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> :
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
                        <span style={{ marginLeft: '0.3rem' }}>{t(item.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'), item)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            style={{ ...styles.toolbarBtn, backgroundColor: activeMenu === 'sort' ? 'var(--bg-secondary, #F3F4F6)' : 'transparent', padding: '0.4rem 0.6rem', borderRadius: '4px' }}
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'sort' ? null : 'sort'); }}
            onMouseEnter={(e) => { if (activeMenu !== 'sort') e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'; }}
            onMouseLeave={(e) => { if (activeMenu !== 'sort') e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            {t("sort", "Sort")}: {t(sortOption.toLowerCase().replace(/ /g, '_'), sortOption)}
          </button>
          {activeMenu === 'sort' && (
            <div style={styles.dropdownMenu} onClick={e => e.stopPropagation()}>
              <button
                style={styles.dropdownItem}
                onClick={() => { setSortOption('Newest'); setActiveMenu(null); }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '16px' }}>{sortOption === 'Newest' && '✓'}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ lineHeight: '1.2' }}>{t("newest", "Newest")}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{t("sort_newest_desc", "See most recent notifications first")}</div>
                </div>
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => { setSortOption('Relevance'); setActiveMenu(null); }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '16px' }}>{sortOption === 'Relevance' && '✓'}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ lineHeight: '1.2' }}>{t("relevance", "Relevance")}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{t("sort_relevance_desc", "See timely, actionable notifications first")}</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            style={{ ...styles.toolbarBtn, backgroundColor: activeMenu === 'density' ? 'var(--bg-secondary, #F3F4F6)' : 'transparent', padding: '0.4rem 0.6rem', borderRadius: '4px' }}
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'density' ? null : 'density'); }}
            onMouseEnter={(e) => { if (activeMenu !== 'density') e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'; }}
            onMouseLeave={(e) => { if (activeMenu !== 'density') e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            {t("density", "Density")}: {t(densityOption.toLowerCase().replace(/ /g, '_'), densityOption)}
          </button>
          {activeMenu === 'density' && (
            <div style={{ ...styles.dropdownMenu, minWidth: '150px' }} onClick={e => e.stopPropagation()}>
              <button
                style={styles.dropdownItem}
                onClick={() => { setDensityOption('Detailed'); setActiveMenu(null); }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '16px' }}>{densityOption === 'Detailed' && '✓'}</div>
                {t("detailed", "Detailed")}
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => { setDensityOption('Compact'); setActiveMenu(null); }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '16px' }}>{densityOption === 'Compact' && '✓'}</div>
                {t("compact", "Compact")}
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        style={{ ...styles.toolbarBtn, padding: '0.4rem 0.6rem', borderRadius: '4px' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F3F4F6)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
      </button>
    </div>

    {/* 4. Content */}
    <div style={{
      flex: 1,
      overflowY: 'auto'
    }}>
      {filteredAndSortedNotifications.length === 0 ? <div style={{
        textAlign: 'center',
        padding: '5rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>🎉</div>
        <h3>{t("you_re_all_caught_up", "You're all caught up!")}</h3>
        <p>{t("no_new_notifications", "No new notifications.")}</p>
      </div> : <div style={styles.list}>
        {filteredAndSortedNotifications.map(n => <div key={n.id} style={{
          ...styles.item,
          ...(n.isRead ? {} : styles.itemUnread)
        }} onClick={() => {
          if (!n.isRead) handleMarkAsRead(n.id);

          if (n.taskId && n.projectId && handleSelectProject) {
            localStorage.setItem('pendingTaskToOpen', n.taskId);
            handleSelectProject({ id: n.projectId });
          } else if (n.projectId && handleSelectProject) {
            handleSelectProject({ id: n.projectId });
          }
        }}>
          <div style={styles.iconBox}>{getIcon(n.type)}</div>
          <div style={styles.content}>
            <div style={{
              ...styles.message,
              fontWeight: n.isRead ? 'normal' : '500'
            }}>
              {n.message}
            </div>
            <div style={styles.meta}>
              {n.actor?.name && <span>{n.actor.name}</span>}
              <span>•</span>
              <span>{new Date(n.createdAt).toLocaleDateString()}</span>
              {n.project && <>
                <span>•</span>
                <span>{n.project.name}</span>
              </>}
            </div>
          </div>
          {!n.isRead && <div style={styles.dot} />}
        </div>)}
      </div>}
    </div>
  </div>;
}